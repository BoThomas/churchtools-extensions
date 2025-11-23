import type {
  RunningDinner,
  Group,
  Route,
  RouteStop,
  MealType,
  Participant,
} from '../types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import { getCurrentTimestamp } from '../types/models';

export interface RoutingResult {
  routes: Omit<Route, 'id'>[];
  warnings: string[];
}

interface RouteAssignment {
  groupId: number;
  stops: {
    starter: number; // hostGroupId
    mainCourse: number; // hostGroupId
    dessert: number; // hostGroupId
  };
}

/**
 * Assign routes to groups ensuring no group meets another group more than once
 * and everyone eats meals in the correct order (starter → main → dessert)
 */
export function assignRoutes(
  dinner: RunningDinner,
  groups: CategoryValue<Group>[],
  participants: CategoryValue<Participant>[],
): RoutingResult {
  const warnings: string[] = [];

  // Validate that all groups have assigned meals
  const groupsWithoutMeals = groups.filter((g) => !g.value.assignedMeal);
  if (groupsWithoutMeals.length > 0) {
    throw new Error(
      `All groups must have an assigned meal. ${groupsWithoutMeals.length} groups are missing meal assignments.`,
    );
  }

  // Group groups by meal type
  const starterGroups = groups.filter(
    (g) => g.value.assignedMeal === 'starter',
  );
  const mainCourseGroups = groups.filter(
    (g) => g.value.assignedMeal === 'mainCourse',
  );
  const dessertGroups = groups.filter(
    (g) => g.value.assignedMeal === 'dessert',
  );

  // Validate equal number of groups per meal
  if (
    starterGroups.length !== mainCourseGroups.length ||
    mainCourseGroups.length !== dessertGroups.length
  ) {
    throw new Error(
      `Unbalanced meal assignments. Need equal groups per meal. ` +
        `Starters: ${starterGroups.length}, Main: ${mainCourseGroups.length}, Desserts: ${dessertGroups.length}`,
    );
  }

  const numGroups = groups.length;
  if (numGroups < 3) {
    throw new Error('Need at least 3 groups (one per meal type).');
  }

  // Check if the no-duplicate constraint is mathematically possible
  // Each group meets 2 others at each of 3 meals = 6 meetings total
  // To avoid duplicates, we need at least 6 other groups available
  // This means minimum 9 groups total (7 would work but requires very careful assignment)
  const canAvoidDuplicates = numGroups >= 9;
  if (!canAvoidDuplicates) {
    warnings.push(
      `With only ${numGroups} groups, it's mathematically impossible to ensure no group meets another group more than once. ` +
        `Each group will meet 2 others at each meal (6 meetings total), but there are only ${numGroups - 1} other groups. ` +
        `For guaranteed no-duplicate assignments, you need at least 9 groups (3 per meal type). ` +
        `The algorithm will try to minimize duplicate meetings.`,
    );
  }

  // Build lookup maps
  const groupById = new Map<number, CategoryValue<Group>>();
  groups.forEach((g) => {
    groupById.set(g.id, g);
  });

  const participantById = new Map<number, CategoryValue<Participant>>();
  participants.forEach((p) => {
    participantById.set(p.id, p);
  });

  // Get host address for a group
  function getHostAddress(group: CategoryValue<Group>) {
    const hostId = group.value.hostParticipantId;
    if (!hostId) {
      throw new Error(`Group ${group.value.groupNumber} has no host assigned.`);
    }
    const host = participantById.get(hostId);
    if (!host) {
      throw new Error(
        `Host participant ${hostId} not found for group ${group.value.groupNumber}.`,
      );
    }
    return host.value.address;
  }

  // Try to find a valid route assignment using backtracking
  const assignments: RouteAssignment[] = [];
  const usedPairs = new Set<string>(); // Track which pairs of groups have met
  const pairMeetCount = new Map<string, number>(); // Track how many times pairs have met

  // Diagnostic tracking
  let attemptCount = 0;
  const maxAttempts = 100000;
  const failureReasons: Map<string, number> = new Map();

  // Relaxed mode: allow duplicates if mathematically necessary
  const relaxedMode = !canAvoidDuplicates;

  function logFailure(reason: string) {
    failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
  }

  function getPairKey(groupId1: number, groupId2: number): string {
    return groupId1 < groupId2
      ? `${groupId1}-${groupId2}`
      : `${groupId2}-${groupId1}`;
  }

  function addPair(groupId1: number, groupId2: number) {
    if (groupId1 === groupId2) return; // Groups always meet themselves
    const key = getPairKey(groupId1, groupId2);
    usedPairs.add(key);
    pairMeetCount.set(key, (pairMeetCount.get(key) || 0) + 1);
  }

  function getMeetCount(groupId1: number, groupId2: number): number {
    if (groupId1 === groupId2) return 0; // A group can host itself
    const key = getPairKey(groupId1, groupId2);
    return pairMeetCount.get(key) || 0;
  }

  function hasMetTooManyTimes(groupId1: number, groupId2: number): boolean {
    const count = getMeetCount(groupId1, groupId2);
    // In relaxed mode, allow up to 2 meetings. In strict mode, allow only 1
    const maxAllowed = relaxedMode ? 2 : 1;
    return count >= maxAllowed;
  }

  // Count how many groups can still meet at each meal location
  function getAvailableSlots(hostId: number, meal: MealType): number {
    const groupsAtThisMeal = assignments.filter(
      (a) => a.stops[meal] === hostId,
    ).length;
    return 3 - groupsAtThisMeal; // Each meal location hosts exactly 3 groups
  }

  function isValidAssignment(
    groupId: number,
    starterHostId: number,
    mainCourseHostId: number,
    dessertHostId: number,
  ): { valid: boolean; reason?: string } {
    const group = groupById.get(groupId);
    if (!group) return { valid: false, reason: 'Group not found' };

    // The group must host its own assigned meal
    const meal = group.value.assignedMeal;
    if (meal === 'starter' && starterHostId !== groupId) {
      return {
        valid: false,
        reason: 'Group must host their assigned meal (starter)',
      };
    }
    if (meal === 'mainCourse' && mainCourseHostId !== groupId) {
      return {
        valid: false,
        reason: 'Group must host their assigned meal (mainCourse)',
      };
    }
    if (meal === 'dessert' && dessertHostId !== groupId) {
      return {
        valid: false,
        reason: 'Group must host their assigned meal (dessert)',
      };
    }

    // Check if this group has already met any of these hosts (too many times)
    const hostsToCheck = [starterHostId, mainCourseHostId, dessertHostId];
    for (const hostId of hostsToCheck) {
      if (hostId !== groupId && hasMetTooManyTimes(groupId, hostId)) {
        const meetCount = getMeetCount(groupId, hostId);
        return {
          valid: false,
          reason: `Group ${groupId} already met host ${hostId} ${meetCount} times`,
        };
      }
    }

    // Check capacity at each meal location (each can host exactly 3 groups)
    if (getAvailableSlots(starterHostId, 'starter') <= 0) {
      return { valid: false, reason: `Starter host ${starterHostId} is full` };
    }
    if (getAvailableSlots(mainCourseHostId, 'mainCourse') <= 0) {
      return {
        valid: false,
        reason: `Main course host ${mainCourseHostId} is full`,
      };
    }
    if (getAvailableSlots(dessertHostId, 'dessert') <= 0) {
      return { valid: false, reason: `Dessert host ${dessertHostId} is full` };
    }

    // Ensure the hosts at this meal will meet exactly 2 other groups (not including themselves)
    // This validates the constraint that each meal location has exactly 3 groups
    const hostsThisGroupVisits = hostsToCheck.filter((h) => h !== groupId);
    for (const hostId of hostsThisGroupVisits) {
      // Check if assigning this group would cause issues with other assignments
      for (const assignment of assignments) {
        const assignedHosts = [
          assignment.stops.starter,
          assignment.stops.mainCourse,
          assignment.stops.dessert,
        ];

        // If the other group is also visiting this host, they would meet
        if (assignedHosts.includes(hostId) && assignment.groupId !== groupId) {
          if (hasMetTooManyTimes(assignment.groupId, groupId)) {
            const meetCount = getMeetCount(assignment.groupId, groupId);
            return {
              valid: false,
              reason: `Would cause too many meetings between ${groupId} and ${assignment.groupId} (already met ${meetCount} times)`,
            };
          }
        }
      }
    }

    return { valid: true };
  }

  function backtrack(groupIndex: number): boolean {
    attemptCount++;

    // Prevent infinite loops
    if (attemptCount > maxAttempts) {
      logFailure('Max attempts exceeded');
      return false;
    }

    // Base case: all groups assigned
    if (groupIndex >= numGroups) {
      return true;
    }

    const currentGroup = groups[groupIndex];
    const currentGroupId = currentGroup.id;
    let triedCombinations = 0;

    // Try all combinations of hosts
    for (const starterGroup of starterGroups) {
      for (const mainCourseGroup of mainCourseGroups) {
        for (const dessertGroup of dessertGroups) {
          triedCombinations++;
          const starterHostId = starterGroup.id;
          const mainCourseHostId = mainCourseGroup.id;
          const dessertHostId = dessertGroup.id;

          const validation = isValidAssignment(
            currentGroupId,
            starterHostId,
            mainCourseHostId,
            dessertHostId,
          );

          if (validation.valid) {
            // Make assignment
            const assignment: RouteAssignment = {
              groupId: currentGroupId,
              stops: {
                starter: starterHostId,
                mainCourse: mainCourseHostId,
                dessert: dessertHostId,
              },
            };
            assignments.push(assignment);

            // Mark pairs as met
            const savedPairs = new Set(usedPairs);
            const hostsToVisit = [
              starterHostId,
              mainCourseHostId,
              dessertHostId,
            ];
            for (const hostId of hostsToVisit) {
              if (hostId !== currentGroupId) {
                addPair(currentGroupId, hostId);
              }
            }

            // Recurse
            if (backtrack(groupIndex + 1)) {
              return true;
            }

            // Backtrack: undo assignment
            assignments.pop();
            usedPairs.clear();
            savedPairs.forEach((pair) => usedPairs.add(pair));
          } else if (validation.reason) {
            logFailure(validation.reason);
          }
        }
      }
    }

    if (triedCombinations === 0) {
      logFailure(`No combinations available for group ${currentGroupId}`);
    }

    return false; // No valid assignment found for this group
  }

  // Run the backtracking algorithm
  const success = backtrack(0);

  if (!success) {
    // Build detailed error message
    let errorMsg = 'Could not find a valid route assignment.\n\n';
    errorMsg += `Attempted ${attemptCount} configurations.\n`;
    errorMsg += `Successfully assigned ${assignments.length} out of ${numGroups} groups.\n\n`;

    if (failureReasons.size > 0) {
      errorMsg += 'Top failure reasons:\n';
      const sortedReasons = Array.from(failureReasons.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      for (const [reason, count] of sortedReasons) {
        errorMsg += `  • ${reason}: ${count} times\n`;
      }
      errorMsg += '\n';
    }

    errorMsg += 'Suggestions:\n';
    if (numGroups < 9) {
      errorMsg += `  • You have only ${numGroups} groups. For no-duplicate meetings, you need at least 9 groups.\n`;
      errorMsg +=
        '  • With fewer groups, duplicate meetings are mathematically unavoidable.\n';
      errorMsg += '  • Consider adding more participants to reach 9+ groups.\n';
    }
    errorMsg += '  • Try reassigning meals to balance the groups differently\n';
    errorMsg += '  • Ensure equal number of groups per meal type\n';
    errorMsg += '  • Total groups must be divisible by 3\n';
    errorMsg += '  • Consider adjusting group compositions\n';
    errorMsg += `  • Current distribution: ${starterGroups.length} starters, ${mainCourseGroups.length} main courses, ${dessertGroups.length} desserts\n`;
    errorMsg += `  • Each meal location must host exactly 3 groups (host + 2 visitors)`;

    console.error('Route assignment diagnostic info:', {
      totalGroups: numGroups,
      assignedGroups: assignments.length,
      attemptCount,
      relaxedMode,
      canAvoidDuplicates,
      failureReasons: Object.fromEntries(failureReasons),
      pairMeetCounts: Object.fromEntries(pairMeetCount),
      assignments,
      starterGroupIds: starterGroups.map((g) => g.id),
      mainCourseGroupIds: mainCourseGroups.map((g) => g.id),
      dessertGroupIds: dessertGroups.map((g) => g.id),
    });

    throw new Error(errorMsg);
  }

  // Convert assignments to Route objects
  const routes: Omit<Route, 'id'>[] = [];
  const now = getCurrentTimestamp();

  for (const assignment of assignments) {
    const group = groupById.get(assignment.groupId);
    if (!group) continue;

    const stops: RouteStop[] = [];

    // Create stops in order: starter → main → dessert
    const meals: Array<{ meal: MealType; hostId: number }> = [
      { meal: 'starter', hostId: assignment.stops.starter },
      { meal: 'mainCourse', hostId: assignment.stops.mainCourse },
      { meal: 'dessert', hostId: assignment.stops.dessert },
    ];

    for (const { meal, hostId } of meals) {
      const hostGroup = groupById.get(hostId);
      if (!hostGroup) continue;

      const stop: RouteStop = {
        meal,
        hostGroupId: hostId,
        hostAddress: getHostAddress(hostGroup),
        startTime: dinner.menu[meal].startTime,
        endTime: dinner.menu[meal].endTime,
      };
      stops.push(stop);
    }

    const route: Omit<Route, 'id'> = {
      dinnerId: dinner.id!,
      groupId: assignment.groupId,
      stops,
      createdAt: now,
      updatedAt: now,
    };

    routes.push(route);
  }

  return { routes, warnings };
}
