import type {
  EventMetadata,
  DinnerGroup,
  Route,
  RouteStop,
  GroupMember,
} from '@/types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import { shuffleArray } from '@/utils/array';

export interface RoutingResult {
  routes: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[];
  warnings: string[];
}

/**
 * Service for assigning routes to dinner groups
 */
export class RoutingService {
  /**
   * Assign routes to dinner groups
   * Constraint: No group meets another group more than once
   *
   * Note: When isDessertLocation is enabled for AfterParty, dessert still uses standard routing
   * (each group is assigned to a dessert host). The display layer will show the
   * after party address instead of the host's home address.
   */
  assignRoutes(
    eventMetadata: EventMetadata,
    dinnerGroups: CategoryValue<DinnerGroup>[],
    _members: GroupMember[], // Reserved for future use (e.g., address lookup)
  ): RoutingResult {
    const warnings: string[] = [];

    // Always use standard routing - isDessertLocation affects display only
    const result = this.assignRoutesStandard(
      eventMetadata,
      dinnerGroups,
      warnings,
    );

    // Add info message when dessert is at after party location
    if (eventMetadata.afterParty?.isDessertLocation) {
      result.warnings.push(
        `Dessert will be served at the after party location. ` +
          `Dessert groups will prepare their desserts at home and bring them there.`,
      );
    }

    return result;
  }

  /**
   * Standard route assignment: all meals at different homes
   *
   * Key constraint: Each group should meet every other group AT MOST once.
   * At each meal, 3 groups are present (host + 2 visitors), so all 3 meet each other.
   *
   * For 9 groups (3 per meal type):
   * - Each group meets 2 others at each meal = 6 total meetings
   * - With 8 other groups, this works perfectly with no duplicates
   *
   * The algorithm uses a constraint-based approach to find valid assignments.
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

    // Group dinner groups by meal type (shuffle for randomization)
    const starterGroups = shuffleArray(
      dinnerGroups.filter((g) => g.value.assignedMeal === 'starter'),
    );
    const mainCourseGroups = shuffleArray(
      dinnerGroups.filter((g) => g.value.assignedMeal === 'mainCourse'),
    );
    const dessertGroups = shuffleArray(
      dinnerGroups.filter((g) => g.value.assignedMeal === 'dessert'),
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

    // Each group meets 2 others at each of 3 meals = 6 meetings
    // For no duplicates, we need at least 9 groups
    const canAvoidDuplicates = numGroups >= 9;
    if (!canAvoidDuplicates) {
      warnings.push(
        `With only ${numGroups} groups, some groups may meet more than once. ` +
          `For guaranteed unique meetings, you need at least 9 groups (3 per meal type). ` +
          `The algorithm will minimize duplicate meetings.`,
      );
    }

    // Build lookup maps
    const groupById = new Map<number, CategoryValue<DinnerGroup>>();
    dinnerGroups.forEach((g) => {
      groupById.set(g.id, g);
    });

    // Create index mappings for easier computation
    const starterIds = starterGroups.map((g) => g.id);
    const mainIds = mainCourseGroups.map((g) => g.id);
    const dessertIds = dessertGroups.map((g) => g.id);

    // For the standard running dinner with 3 groups per meal type:
    // We need to create a "rotation" where each group visits different hosts
    // and meets different groups at each meal.

    // Use Latin Square approach for optimal assignment:
    // Each row = a group, each column = a meal, value = which "table" they're at
    // Groups at the same table for a meal will meet each other

    // For starter: table assignment is straightforward - each starter group hosts table 0, 1, 2
    // Main course and dessert visitors need to be assigned so no pair meets twice

    // Track which groups meet at each meal
    const starterTables: number[][] = starterIds.map((id) => [id]); // Each starter host is a table
    const mainTables: number[][] = mainIds.map((id) => [id]);
    const dessertTables: number[][] = dessertIds.map((id) => [id]);

    // Track all meetings globally
    const meetings = new Set<string>();

    function getPairKey(id1: number, id2: number): string {
      return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
    }

    function haveMet(id1: number, id2: number): boolean {
      return meetings.has(getPairKey(id1, id2));
    }

    function recordMeeting(id1: number, id2: number): void {
      if (id1 !== id2) {
        meetings.add(getPairKey(id1, id2));
      }
    }

    function wouldCauseDuplicate(
      groupId: number,
      tableMembers: number[],
    ): boolean {
      for (const memberId of tableMembers) {
        if (haveMet(groupId, memberId)) {
          return true;
        }
      }
      return false;
    }

    function recordTableMeetings(tableMembers: number[]): void {
      for (let i = 0; i < tableMembers.length; i++) {
        for (let j = i + 1; j < tableMembers.length; j++) {
          recordMeeting(tableMembers[i], tableMembers[j]);
        }
      }
    }

    // Try to find a valid assignment using backtracking
    // We need to assign each non-host group to tables for meals they don't host

    // Collect all groups that need visitor assignments for each meal
    const starterVisitors = [...mainIds, ...dessertIds]; // Groups visiting starter hosts
    const mainVisitors = [...starterIds, ...dessertIds]; // Groups visiting main hosts
    const dessertVisitors = [...starterIds, ...mainIds]; // Groups visiting dessert hosts

    // Use backtracking to find valid assignments
    function tryAssignments(): boolean {
      // Reset state
      meetings.clear();
      starterTables.forEach((table, i) => {
        table.length = 0;
        table.push(starterIds[i]);
      });
      mainTables.forEach((table, i) => {
        table.length = 0;
        table.push(mainIds[i]);
      });
      dessertTables.forEach((table, i) => {
        table.length = 0;
        table.push(dessertIds[i]);
      });

      // Assign visitors to starter tables
      const shuffledStarterVisitors = shuffleArray([...starterVisitors]);
      if (!assignVisitorsToTables(shuffledStarterVisitors, starterTables)) {
        return false;
      }

      // Record starter meetings
      starterTables.forEach((table) => recordTableMeetings(table));

      // Assign visitors to main tables
      const shuffledMainVisitors = shuffleArray([...mainVisitors]);
      if (!assignVisitorsToTables(shuffledMainVisitors, mainTables)) {
        return false;
      }

      // Record main meetings
      mainTables.forEach((table) => recordTableMeetings(table));

      // Assign visitors to dessert tables
      const shuffledDessertVisitors = shuffleArray([...dessertVisitors]);
      if (!assignVisitorsToTables(shuffledDessertVisitors, dessertTables)) {
        return false;
      }

      return true;
    }

    function assignVisitorsToTables(
      visitors: number[],
      tables: number[][],
    ): boolean {
      const targetSize = 3; // Each table should have 3 groups (1 host + 2 visitors)
      const unassigned = [...visitors];

      // Use backtracking for assignment
      return backtrackAssign(unassigned, tables, targetSize, 0);
    }

    function backtrackAssign(
      unassigned: number[],
      tables: number[][],
      targetSize: number,
      depth: number,
    ): boolean {
      // Base case: all visitors assigned
      if (unassigned.length === 0) {
        // Check all tables have correct size
        return tables.every((t) => t.length === targetSize);
      }

      // Limit recursion depth to prevent infinite loops
      if (depth > 1000) {
        return false;
      }

      const visitor = unassigned[0];
      const remaining = unassigned.slice(1);

      // Try each table in random order
      const tableOrder = shuffleArray(
        tables.map((_, i) => i).filter((i) => tables[i].length < targetSize),
      );

      for (const tableIdx of tableOrder) {
        const table = tables[tableIdx];

        // Check if this assignment would cause a duplicate meeting
        if (canAvoidDuplicates && wouldCauseDuplicate(visitor, table)) {
          continue;
        }

        // Try this assignment
        table.push(visitor);

        if (backtrackAssign(remaining, tables, targetSize, depth + 1)) {
          return true;
        }

        // Backtrack
        table.pop();
      }

      // If we can't avoid duplicates, allow them
      if (!canAvoidDuplicates) {
        // Find table with most space
        const availableTables = tables
          .map((t, i) => ({ idx: i, space: targetSize - t.length }))
          .filter((t) => t.space > 0)
          .sort((a, b) => b.space - a.space);

        if (availableTables.length > 0) {
          const table = tables[availableTables[0].idx];
          table.push(visitor);
          return backtrackAssign(remaining, tables, targetSize, depth + 1);
        }
      }

      return false;
    }

    // Try multiple times with different random orderings
    let success = false;
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Re-shuffle the group lists for each attempt
      shuffleArray(starterIds);
      shuffleArray(mainIds);
      shuffleArray(dessertIds);

      if (tryAssignments()) {
        success = true;
        break;
      }
    }

    if (!success) {
      throw new Error(
        `Could not find valid route assignments after ${maxAttempts} attempts. ` +
          `This may happen with unusual group configurations. ` +
          `Try regenerating the groups or adjusting group sizes.`,
      );
    }

    // Build routes from table assignments
    const routes: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    // Create a map from groupId to their table assignments
    const groupToStarter = new Map<number, number>();
    const groupToMain = new Map<number, number>();
    const groupToDessert = new Map<number, number>();

    starterTables.forEach((table, tableIdx) => {
      const hostId = starterIds[tableIdx];
      table.forEach((groupId) => {
        groupToStarter.set(groupId, hostId);
      });
    });

    mainTables.forEach((table, tableIdx) => {
      const hostId = mainIds[tableIdx];
      table.forEach((groupId) => {
        groupToMain.set(groupId, hostId);
      });
    });

    dessertTables.forEach((table, tableIdx) => {
      const hostId = dessertIds[tableIdx];
      table.forEach((groupId) => {
        groupToDessert.set(groupId, hostId);
      });
    });

    // Create routes for each group
    for (const group of dinnerGroups) {
      const groupId = group.id;

      const starterHostId = groupToStarter.get(groupId);
      const mainHostId = groupToMain.get(groupId);
      const dessertHostId = groupToDessert.get(groupId);

      if (
        starterHostId === undefined ||
        mainHostId === undefined ||
        dessertHostId === undefined
      ) {
        throw new Error(
          `Failed to assign complete route for group ${group.value.groupNumber}`,
        );
      }

      const stops: RouteStop[] = [
        {
          meal: 'starter',
          hostDinnerGroupId: starterHostId,
          startTime: eventMetadata.menu.starter.startTime,
          endTime: eventMetadata.menu.starter.endTime,
        },
        {
          meal: 'mainCourse',
          hostDinnerGroupId: mainHostId,
          startTime: eventMetadata.menu.mainCourse.startTime,
          endTime: eventMetadata.menu.mainCourse.endTime,
        },
        {
          meal: 'dessert',
          hostDinnerGroupId: dessertHostId,
          startTime: eventMetadata.menu.dessert.startTime,
          endTime: eventMetadata.menu.dessert.endTime,
        },
      ];

      routes.push({
        eventMetadataId: eventMetadata.id!,
        dinnerGroupId: groupId,
        stops,
      });
    }

    // Verify no duplicate meetings (for debugging)
    const meetingCounts = new Map<string, number>();
    for (const route of routes) {
      const groupId = route.dinnerGroupId;

      for (const stop of route.stops) {
        // Find all groups at this table
        let tableMembers: number[] = [];
        if (stop.meal === 'starter') {
          const tableIdx = starterIds.indexOf(stop.hostDinnerGroupId);
          tableMembers = starterTables[tableIdx] || [];
        } else if (stop.meal === 'mainCourse') {
          const tableIdx = mainIds.indexOf(stop.hostDinnerGroupId);
          tableMembers = mainTables[tableIdx] || [];
        } else {
          const tableIdx = dessertIds.indexOf(stop.hostDinnerGroupId);
          tableMembers = dessertTables[tableIdx] || [];
        }

        for (const otherId of tableMembers) {
          if (otherId !== groupId) {
            const key = getPairKey(groupId, otherId);
            meetingCounts.set(key, (meetingCounts.get(key) || 0) + 1);
          }
        }
      }
    }

    // Check for duplicates
    const duplicates: string[] = [];
    for (const [pair, count] of meetingCounts) {
      // Count is doubled because we count from both perspectives
      const actualCount = count / 2;
      if (actualCount > 1) {
        const [id1, id2] = pair.split('-').map(Number);
        const group1 = groupById.get(id1);
        const group2 = groupById.get(id2);
        if (group1 && group2) {
          duplicates.push(
            `G${group1.value.groupNumber} & G${group2.value.groupNumber} (${actualCount}x)`,
          );
        }
      }
    }

    if (duplicates.length > 0) {
      warnings.push(`Duplicate meetings: ${duplicates.join(', ')}`);
    }

    return { routes, warnings };
  }
}

// Export singleton instance
export const routingService = new RoutingService();
