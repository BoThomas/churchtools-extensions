import type {
  EventMetadata,
  DinnerGroup,
  GroupMember,
  MealType,
} from '@/types/models';

export interface GroupingResult {
  dinnerGroups: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[];
  warnings: string[];
  waitlistedPersonIds: number[];
}

interface PreferenceGraph {
  mutual: Map<number, Set<number>>; // Bidirectional preferences
  oneSided: Map<number, Set<number>>; // Unidirectional preferences
}

/**
 * Service for creating dinner groups from ChurchTools group members
 */
export class GroupingService {
  /**
   * Create dinner groups from ChurchTools group members
   */
  createDinnerGroups(
    eventMetadata: EventMetadata,
    members: GroupMember[],
  ): GroupingResult {
    const warnings: string[] = [];
    const waitlistedPersonIds: number[] = [];

    // Filter out waiting list and inactive members
    const activeMembers = members.filter(
      (m) => m.groupMemberStatus === 'active',
    );

    // Validate minimum members
    const minMembers = 3 * eventMetadata.preferredGroupSize;
    if (activeMembers.length < minMembers) {
      throw new Error(
        `Need at least ${minMembers} members (3 meals × ${eventMetadata.preferredGroupSize} people per group). Currently have ${activeMembers.length}.`,
      );
    }

    // Calculate ideal number of groups (must be multiple of 3)
    const idealGroupCount = Math.floor(
      activeMembers.length / eventMetadata.preferredGroupSize,
    );
    const needsMultipleOf3 = idealGroupCount - (idealGroupCount % 3);
    const idealMemberCount =
      needsMultipleOf3 * eventMetadata.preferredGroupSize;

    // Handle excess members
    let workingMembers = [...activeMembers];
    if (activeMembers.length > idealMemberCount) {
      const excess = activeMembers.length - idealMemberCount;
      warnings.push(
        `${excess} member(s) will not be assigned to groups to achieve group balance (need multiple of 3 groups)`,
      );

      // Sort by registration date (latest first) to exclude most recent
      workingMembers.sort(
        (a, b) =>
          new Date(b.memberStartDate || '').getTime() -
          new Date(a.memberStartDate || '').getTime(),
      );

      // Move excess to waitlist
      const toWaitlist = workingMembers.splice(0, excess);
      waitlistedPersonIds.push(...toWaitlist.map((m) => m.personId));
    }

    // Build preference graph
    const graph = this.buildPreferenceGraph(workingMembers);

    // Create groups using greedy algorithm
    const groups: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const assigned = new Set<number>();
    let groupNumber = 1;

    // Step 1: Process mutual preferences first
    for (const [personId, mutualPartners] of graph.mutual) {
      if (assigned.has(personId)) continue;

      const groupMembers: number[] = [personId];
      assigned.add(personId);

      // Add mutual partners
      for (const partnerId of mutualPartners) {
        if (
          !assigned.has(partnerId) &&
          groupMembers.length < eventMetadata.preferredGroupSize
        ) {
          groupMembers.push(partnerId);
          assigned.add(partnerId);
        }
      }

      // If group is smaller than preferred, try to add one-sided preferences
      if (groupMembers.length < eventMetadata.preferredGroupSize) {
        const oneSidedPrefs = graph.oneSided.get(personId) || new Set();
        for (const preferredId of oneSidedPrefs) {
          if (
            !assigned.has(preferredId) &&
            groupMembers.length < eventMetadata.preferredGroupSize
          ) {
            groupMembers.push(preferredId);
            assigned.add(preferredId);
          }
        }
      }

      // Fill group with unassigned singles
      if (groupMembers.length < eventMetadata.preferredGroupSize) {
        for (const m of workingMembers) {
          if (
            !assigned.has(m.personId) &&
            groupMembers.length < eventMetadata.preferredGroupSize
          ) {
            groupMembers.push(m.personId);
            assigned.add(m.personId);
          }
        }
      }

      if (groupMembers.length === eventMetadata.preferredGroupSize) {
        groups.push({
          eventMetadataId: eventMetadata.id!,
          ctGroupId: eventMetadata.groupId,
          groupNumber: groupNumber++,
          memberPersonIds: groupMembers,
          assignedMeal: 'starter', // Will be assigned properly later
        });
      } else {
        warnings.push(
          `Group ${groupNumber - 1} has ${groupMembers.length} members (expected ${eventMetadata.preferredGroupSize})`,
        );
      }
    }

    // Step 2: Create groups from remaining unassigned members
    const unassigned = workingMembers.filter((m) => !assigned.has(m.personId));
    for (
      let i = 0;
      i < unassigned.length;
      i += eventMetadata.preferredGroupSize
    ) {
      const groupMembers = unassigned
        .slice(i, i + eventMetadata.preferredGroupSize)
        .map((m) => m.personId);

      if (groupMembers.length === eventMetadata.preferredGroupSize) {
        groups.push({
          eventMetadataId: eventMetadata.id!,
          ctGroupId: eventMetadata.groupId,
          groupNumber: groupNumber++,
          memberPersonIds: groupMembers,
          assignedMeal: 'starter', // Will be assigned properly later
        });
      } else if (groupMembers.length > 0) {
        warnings.push(
          `Incomplete group with ${groupMembers.length} members (expected ${eventMetadata.preferredGroupSize})`,
        );
      }
    }

    // Step 3: Assign meals to groups
    const groupsWithMeals = this.assignMeals(
      groups,
      workingMembers,
      eventMetadata,
      warnings,
    );

    // Check for preference mismatches
    this.checkPreferenceMismatches(
      groupsWithMeals,
      workingMembers,
      graph,
      warnings,
    );

    return {
      dinnerGroups: groupsWithMeals,
      warnings,
      waitlistedPersonIds,
    };
  }

  /**
   * Build preference graph from members
   */
  private buildPreferenceGraph(members: GroupMember[]): PreferenceGraph {
    const mutual = new Map<number, Set<number>>();
    const oneSided = new Map<number, Set<number>>();
    const emailToId = new Map<string, number>();

    // Build email to ID mapping
    members.forEach((m) => {
      if (m.person.email) {
        emailToId.set(m.person.email.toLowerCase(), m.personId);
      }
    });

    // Process preferences
    members.forEach((m) => {
      const personId = m.personId;
      const partnerPref = m.fields?.partnerPreference;

      if (!partnerPref) return;

      // Parse comma-separated emails/names
      const partnerEmails = partnerPref
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.includes('@')); // Only process emails

      partnerEmails.forEach((partnerEmail) => {
        const partnerId = emailToId.get(partnerEmail);
        if (!partnerId) return; // Partner not registered

        // Check if preference is mutual
        const partner = members.find((mm) => mm.personId === partnerId);
        const partnerPrefs = partner?.fields?.partnerPreference;

        if (
          partner &&
          partnerPrefs &&
          m.person.email &&
          partnerPrefs.toLowerCase().includes(m.person.email.toLowerCase())
        ) {
          // Mutual preference
          if (!mutual.has(personId)) mutual.set(personId, new Set());
          if (!mutual.has(partnerId)) mutual.set(partnerId, new Set());
          mutual.get(personId)!.add(partnerId);
          mutual.get(partnerId)!.add(personId);
        } else {
          // One-sided preference
          if (!oneSided.has(personId)) oneSided.set(personId, new Set());
          oneSided.get(personId)!.add(partnerId);
        }
      });
    });

    return { mutual, oneSided };
  }

  /**
   * Assign meals to groups, respecting preferences but forcing assignments if needed
   */
  private assignMeals(
    groups: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[],
    members: GroupMember[],
    _eventMetadata: EventMetadata,
    warnings: string[],
  ): Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[] {
    const mealsPerGroup = groups.length / 3;

    if (groups.length % 3 !== 0) {
      warnings.push(
        `Group count (${groups.length}) is not divisible by 3. Meal assignment may be unbalanced.`,
      );
    }

    // Count meal preferences
    const mealPreferences = new Map<number, MealType | undefined>();
    groups.forEach((group) => {
      // Use first member's preference as group preference
      const firstMember = members.find(
        (m) => m.personId === group.memberPersonIds[0],
      );
      const pref = firstMember?.fields?.mealPreference;
      if (
        pref &&
        pref !== 'none' &&
        (pref === 'starter' || pref === 'mainCourse' || pref === 'dessert')
      ) {
        mealPreferences.set(group.groupNumber, pref);
      }
    });

    // Try to assign based on preferences first
    const meals: MealType[] = ['starter', 'mainCourse', 'dessert'];
    const assignedMeals = new Map<MealType, number>(); // Count per meal
    const assigned = new Set<number>();

    meals.forEach((meal) => {
      assignedMeals.set(meal, 0);
    });

    // Assign preferred meals
    groups.forEach((group) => {
      const preference = mealPreferences.get(group.groupNumber);
      if (preference && assignedMeals.get(preference)! < mealsPerGroup) {
        group.assignedMeal = preference;
        assignedMeals.set(preference, assignedMeals.get(preference)! + 1);
        assigned.add(group.groupNumber);
      }
    });

    // Fill remaining groups with available meals
    groups.forEach((group) => {
      if (!assigned.has(group.groupNumber)) {
        // Find meal with fewest assignments
        let minMeal: MealType = 'starter';
        let minCount = assignedMeals.get('starter')!;

        meals.forEach((meal) => {
          const count = assignedMeals.get(meal)!;
          if (count < minCount) {
            minMeal = meal;
            minCount = count;
          }
        });

        group.assignedMeal = minMeal;
        assignedMeals.set(minMeal, assignedMeals.get(minMeal)! + 1);

        const preference = mealPreferences.get(group.groupNumber);
        if (preference && preference !== minMeal) {
          warnings.push(
            `Group ${group.groupNumber} assigned ${minMeal} instead of preferred ${preference}`,
          );
        }
      }
    });

    // Assign host (first member in each group)
    groups.forEach((group) => {
      group.hostPersonId = group.memberPersonIds[0];
    });

    return groups;
  }

  /**
   * Check for preference mismatches and add warnings
   */
  private checkPreferenceMismatches(
    groups: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[],
    members: GroupMember[],
    graph: PreferenceGraph,
    warnings: string[],
  ): void {
    groups.forEach((group) => {
      group.memberPersonIds.forEach((personId) => {
        const member = members.find((m) => m.personId === personId);
        if (!member) return;

        // Check if any preferred partners are not in this group
        const preferredInGroup = new Set(group.memberPersonIds);
        const mutual = graph.mutual.get(personId) || new Set();

        const unmatchedMutual = [...mutual].filter(
          (id) => !preferredInGroup.has(id),
        );

        if (unmatchedMutual.length > 0) {
          warnings.push(
            `${member.person.firstName} ${member.person.lastName} has mutual preferences not in their group`,
          );
        }
      });
    });
  }
}

// Export singleton instance
export const groupingService = new GroupingService();
