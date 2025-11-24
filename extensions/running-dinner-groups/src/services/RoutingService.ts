import type {
  EventMetadata,
  DinnerGroup,
  Route,
  RouteStop,
  GroupMember,
  MealType,
} from '@/types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';

export interface RoutingResult {
  routes: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[];
  warnings: string[];
}

interface RouteAssignment {
  dinnerGroupId: number;
  stops: {
    starter: number; // hostDinnerGroupId
    mainCourse: number; // hostDinnerGroupId
    dessert: number; // hostDinnerGroupId
  };
}

/**
 * Service for assigning routes to dinner groups
 */
export class RoutingService {
  /**
   * Assign routes to dinner groups
   * Constraint: No group meets another group more than once
   */
  assignRoutes(
    eventMetadata: EventMetadata,
    dinnerGroups: CategoryValue<DinnerGroup>[],
    _members: GroupMember[], // Reserved for future use (e.g., address lookup)
  ): RoutingResult {
    const warnings: string[] = [];

    // Check if dessert is at after party location
    const dessertAtAfterParty =
      eventMetadata.afterParty?.isDessertLocation ?? false;

    if (dessertAtAfterParty) {
      // Special case: dessert happens at after party for all groups
      return this.assignRoutesWithCentralDessert(
        eventMetadata,
        dinnerGroups,
        warnings,
      );
    }

    // Standard routing: all meals at different homes
    return this.assignRoutesStandard(eventMetadata, dinnerGroups, warnings);
  }

  /**
   * Assign routes when dessert is at a central after party location
   */
  private assignRoutesWithCentralDessert(
    eventMetadata: EventMetadata,
    dinnerGroups: CategoryValue<DinnerGroup>[],
    warnings: string[],
  ): RoutingResult {
    // Validate that all groups have assigned meals
    const groupsWithoutMeals = dinnerGroups.filter(
      (g) => !g.value.assignedMeal,
    );
    if (groupsWithoutMeals.length > 0) {
      throw new Error(
        `All groups must have an assigned meal. ${groupsWithoutMeals.length} groups are missing meal assignments.`,
      );
    }

    // Group dinner groups by meal type
    const starterGroups = dinnerGroups.filter(
      (g) => g.value.assignedMeal === 'starter',
    );
    const mainCourseGroups = dinnerGroups.filter(
      (g) => g.value.assignedMeal === 'mainCourse',
    );
    const dessertGroups = dinnerGroups.filter(
      (g) => g.value.assignedMeal === 'dessert',
    );

    // For central dessert, we only need equal starters and main courses
    // Dessert groups don't host, they just mark the after party venue
    if (starterGroups.length !== mainCourseGroups.length) {
      throw new Error(
        `Need equal number of starter and main course groups. ` +
          `Starters: ${starterGroups.length}, Main: ${mainCourseGroups.length}`,
      );
    }

    warnings.push(
      `Dessert will be held at the after party location (${eventMetadata.afterParty?.location}) for all groups. ` +
        `No individual dessert hosts needed.`,
    );

    // Build lookup maps
    const groupById = new Map<number, CategoryValue<DinnerGroup>>();
    dinnerGroups.forEach((g) => {
      groupById.set(g.id, g);
    });

    // Simplified assignment: only need to pair starters with main courses
    // Each group goes to one starter location and one main course location
    // Then everyone goes to the same dessert location (after party)
    const routes: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    // Use a simple round-robin assignment to avoid duplicates as much as possible
    for (let i = 0; i < dinnerGroups.length; i++) {
      const group = dinnerGroups[i];
      const stops: RouteStop[] = [];

      // Find starter host (rotate through starter groups)
      const starterIndex = i % starterGroups.length;
      const starterHost = starterGroups[starterIndex];

      stops.push({
        meal: 'starter',
        hostDinnerGroupId: starterHost.id,
        startTime: eventMetadata.menu.starter.startTime,
        endTime: eventMetadata.menu.starter.endTime,
      });

      // Find main course host (rotate through main course groups, offset to reduce duplicates)
      const mainIndex =
        (i + Math.floor(starterGroups.length / 2)) % mainCourseGroups.length;
      const mainHost = mainCourseGroups[mainIndex];

      stops.push({
        meal: 'mainCourse',
        hostDinnerGroupId: mainHost.id,
        startTime: eventMetadata.menu.mainCourse.startTime,
        endTime: eventMetadata.menu.mainCourse.endTime,
      });

      // Dessert: use first dessert group as placeholder (represents after party)
      // In reality, all groups go to after party location, not a home
      const dessertPlaceholder = dessertGroups[0] || starterGroups[0]; // Fallback to any group

      stops.push({
        meal: 'dessert',
        hostDinnerGroupId: dessertPlaceholder.id,
        startTime: eventMetadata.menu.dessert.startTime,
        endTime: eventMetadata.menu.dessert.endTime,
      });

      routes.push({
        eventMetadataId: eventMetadata.id!,
        dinnerGroupId: group.id,
        stops,
      });
    }

    return { routes, warnings };
  }

  /**
   * Standard route assignment: all meals at different homes
   */
  private assignRoutesStandard(
    eventMetadata: EventMetadata,
    dinnerGroups: CategoryValue<DinnerGroup>[],
    warnings: string[],
  ): RoutingResult {
    // Validate that all groups have assigned meals
    const groupsWithoutMeals = dinnerGroups.filter(
      (g) => !g.value.assignedMeal,
    );
    if (groupsWithoutMeals.length > 0) {
      throw new Error(
        `All groups must have an assigned meal. ${groupsWithoutMeals.length} groups are missing meal assignments.`,
      );
    }

    // Group dinner groups by meal type
    const starterGroups = dinnerGroups.filter(
      (g) => g.value.assignedMeal === 'starter',
    );
    const mainCourseGroups = dinnerGroups.filter(
      (g) => g.value.assignedMeal === 'mainCourse',
    );
    const dessertGroups = dinnerGroups.filter(
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

    const numGroups = dinnerGroups.length;
    if (numGroups < 3) {
      throw new Error('Need at least 3 groups (one per meal type).');
    }

    // Check if the no-duplicate constraint is mathematically possible
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
    const groupById = new Map<number, CategoryValue<DinnerGroup>>();
    dinnerGroups.forEach((g) => {
      groupById.set(g.id, g);
    });

    // Try to find a valid route assignment using backtracking
    const assignments: RouteAssignment[] = [];
    const usedPairs = new Set<string>();
    const pairMeetCount = new Map<string, number>();

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
      if (groupId1 === groupId2) return;
      const key = getPairKey(groupId1, groupId2);
      usedPairs.add(key);
      pairMeetCount.set(key, (pairMeetCount.get(key) || 0) + 1);
    }

    function getMeetCount(groupId1: number, groupId2: number): number {
      if (groupId1 === groupId2) return 0;
      const key = getPairKey(groupId1, groupId2);
      return pairMeetCount.get(key) || 0;
    }

    function hasMetTooManyTimes(groupId1: number, groupId2: number): boolean {
      const count = getMeetCount(groupId1, groupId2);
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

    function scoreAssignment(
      groupId: number,
      starterHostId: number,
      mainCourseHostId: number,
      dessertHostId: number,
    ): number {
      let score = 0;

      // Strongly prefer different hosts for different meals (variety bonus)
      const hosts = [starterHostId, mainCourseHostId, dessertHostId];
      const uniqueHosts = new Set(hosts.filter((h) => h !== groupId));
      score += uniqueHosts.size * 100;

      // Penalize meeting the same groups multiple times
      const hostsToCheck = [starterHostId, mainCourseHostId, dessertHostId];
      for (const hostId of hostsToCheck) {
        if (hostId !== groupId) {
          const meetCount = getMeetCount(groupId, hostId);
          score -= meetCount * 50;
        }
      }

      return score;
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
        return {
          valid: false,
          reason: `Starter host ${starterHostId} is full`,
        };
      }
      if (getAvailableSlots(mainCourseHostId, 'mainCourse') <= 0) {
        return {
          valid: false,
          reason: `Main course host ${mainCourseHostId} is full`,
        };
      }
      if (getAvailableSlots(dessertHostId, 'dessert') <= 0) {
        return {
          valid: false,
          reason: `Dessert host ${dessertHostId} is full`,
        };
      }

      // Ensure the hosts at this meal will meet exactly 2 other groups (not including themselves)
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
          if (
            assignedHosts.includes(hostId) &&
            assignment.dinnerGroupId !== groupId
          ) {
            if (hasMetTooManyTimes(assignment.dinnerGroupId, groupId)) {
              const meetCount = getMeetCount(assignment.dinnerGroupId, groupId);
              return {
                valid: false,
                reason: `Would cause too many meetings between ${groupId} and ${assignment.dinnerGroupId} (already met ${meetCount} times)`,
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

      const currentGroup = dinnerGroups[groupIndex];
      const currentGroupId = currentGroup.id;

      // Collect all valid assignments with their scores
      const candidates: Array<{
        assignment: RouteAssignment;
        score: number;
      }> = [];

      // Try all combinations of hosts
      for (const starterGroup of starterGroups) {
        for (const mainCourseGroup of mainCourseGroups) {
          for (const dessertGroup of dessertGroups) {
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
              const score = scoreAssignment(
                currentGroupId,
                starterHostId,
                mainCourseHostId,
                dessertHostId,
              );

              const assignment: RouteAssignment = {
                dinnerGroupId: currentGroupId,
                stops: {
                  starter: starterHostId,
                  mainCourse: mainCourseHostId,
                  dessert: dessertHostId,
                },
              };

              candidates.push({ assignment, score });
            } else if (validation.reason) {
              logFailure(validation.reason);
            }
          }
        }
      }

      if (candidates.length === 0) {
        logFailure(`No valid assignments for group ${currentGroupId}`);
        return false;
      }

      // Sort candidates by score (highest first) to try best options first
      candidates.sort((a, b) => b.score - a.score);

      // Try candidates in order of score
      for (const candidate of candidates) {
        const assignment = candidate.assignment;

        assignments.push(assignment);

        // Mark pairs as met
        const savedPairs = new Set(usedPairs);
        const savedCounts = new Map(pairMeetCount);
        const hostsToVisit = [
          assignment.stops.starter,
          assignment.stops.mainCourse,
          assignment.stops.dessert,
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
        pairMeetCount.clear();
        savedCounts.forEach((count, pair) => pairMeetCount.set(pair, count));
      }

      return false;
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
        errorMsg +=
          '  • Consider adding more participants to reach 9+ groups.\n';
      }
      errorMsg +=
        '  • Try reassigning meals to balance the groups differently\n';
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
    const routes: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    for (const assignment of assignments) {
      const group = groupById.get(assignment.dinnerGroupId);
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
          hostDinnerGroupId: hostId,
          startTime: eventMetadata.menu[meal].startTime,
          endTime: eventMetadata.menu[meal].endTime,
        };
        stops.push(stop);
      }

      const route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'> = {
        eventMetadataId: eventMetadata.id!,
        dinnerGroupId: assignment.dinnerGroupId,
        stops,
      };

      routes.push(route);
    }

    return { routes, warnings };
  }
}

// Export singleton instance
export const routingService = new RoutingService();
