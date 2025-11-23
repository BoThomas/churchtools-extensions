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

  function addPair(groupId1: number, groupId2: number) {
    if (groupId1 === groupId2) return; // Groups always meet themselves
    const key =
      groupId1 < groupId2
        ? `${groupId1}-${groupId2}`
        : `${groupId2}-${groupId1}`;
    usedPairs.add(key);
  }

  function hasMet(groupId1: number, groupId2: number): boolean {
    if (groupId1 === groupId2) return false; // A group can host itself
    const key =
      groupId1 < groupId2
        ? `${groupId1}-${groupId2}`
        : `${groupId2}-${groupId1}`;
    return usedPairs.has(key);
  }

  function isValidAssignment(
    groupId: number,
    starterHostId: number,
    mainCourseHostId: number,
    dessertHostId: number,
  ): boolean {
    const group = groupById.get(groupId);
    if (!group) return false;

    // The group must host its own assigned meal
    const meal = group.value.assignedMeal;
    if (meal === 'starter' && starterHostId !== groupId) return false;
    if (meal === 'mainCourse' && mainCourseHostId !== groupId) return false;
    if (meal === 'dessert' && dessertHostId !== groupId) return false;

    // Check if this group has already met any of these hosts
    // (excluding itself)
    const hostsToCheck = [starterHostId, mainCourseHostId, dessertHostId];
    for (const hostId of hostsToCheck) {
      if (hostId !== groupId && hasMet(groupId, hostId)) {
        return false;
      }
    }

    // Check if any of the other groups in existing assignments have met these hosts
    // This prevents conflicts with already assigned routes
    for (const assignment of assignments) {
      const assignedHosts = [
        assignment.stops.starter,
        assignment.stops.mainCourse,
        assignment.stops.dessert,
      ];

      // Check if the proposed hosts would cause the assigned group to meet someone twice
      for (const proposedHost of hostsToCheck) {
        if (proposedHost === groupId) continue;
        if (
          assignedHosts.includes(proposedHost) &&
          proposedHost !== assignment.groupId
        ) {
          // This proposed host is already in another group's route
          // Check if it would cause a duplicate meeting
          if (hasMet(assignment.groupId, proposedHost)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  function backtrack(groupIndex: number): boolean {
    // Base case: all groups assigned
    if (groupIndex >= numGroups) {
      return true;
    }

    const currentGroup = groups[groupIndex];
    const currentGroupId = currentGroup.id;

    // Try all combinations of hosts
    for (const starterGroup of starterGroups) {
      for (const mainCourseGroup of mainCourseGroups) {
        for (const dessertGroup of dessertGroups) {
          const starterHostId = starterGroup.id;
          const mainCourseHostId = mainCourseGroup.id;
          const dessertHostId = dessertGroup.id;

          if (
            isValidAssignment(
              currentGroupId,
              starterHostId,
              mainCourseHostId,
              dessertHostId,
            )
          ) {
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
            if (starterHostId !== currentGroupId) {
              addPair(currentGroupId, starterHostId);
            }
            if (mainCourseHostId !== currentGroupId) {
              addPair(currentGroupId, mainCourseHostId);
            }
            if (dessertHostId !== currentGroupId) {
              addPair(currentGroupId, dessertHostId);
            }

            // Recurse
            if (backtrack(groupIndex + 1)) {
              return true;
            }

            // Backtrack: undo assignment
            assignments.pop();
            usedPairs.clear();
            savedPairs.forEach((pair) => usedPairs.add(pair));
          }
        }
      }
    }

    return false; // No valid assignment found for this group
  }

  // Run the backtracking algorithm
  const success = backtrack(0);

  if (!success) {
    throw new Error(
      'Could not find a valid route assignment. Try adjusting group compositions or meal assignments.',
    );
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
