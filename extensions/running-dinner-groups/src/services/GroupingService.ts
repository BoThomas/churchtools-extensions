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
 * Shuffle an array in place using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Service for creating dinner groups from ChurchTools group members
 */
export class GroupingService {
  /**
   * Create dinner groups from ChurchTools group members
   *
   * Algorithm priority:
   * 1. Honor mutual partner preferences (highest priority)
   * 2. Group people by meal preference (so groups naturally get their preferred meal)
   * 3. Balance group sizes and meal distribution
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
    const groupsPerMeal = needsMultipleOf3 / 3;
    const idealMemberCount =
      needsMultipleOf3 * eventMetadata.preferredGroupSize;

    // Build preference graph BEFORE handling excess members
    // so we know who has partner preferences
    const graph = this.buildPreferenceGraph(activeMembers);

    // Handle excess members - prioritize keeping people with partner preferences
    let workingMembers = [...activeMembers];
    if (activeMembers.length > idealMemberCount) {
      const excess = activeMembers.length - idealMemberCount;
      warnings.push(
        `${excess} member(s) will not be assigned to groups to achieve group balance (need multiple of 3 groups)`,
      );

      // Score each member for waitlist priority (higher = more likely to waitlist)
      const waitlistScores = activeMembers.map((member) => {
        let score = 0;

        // People WITH mutual partner preferences should stay (low score)
        const hasMutualPartner = graph.mutual.has(member.personId);
        if (hasMutualPartner) {
          score -= 100; // Strong preference to keep
        }

        // People WITH one-sided preferences (they want someone) - medium priority to keep
        const hasOneSidedPref = graph.oneSided.has(member.personId);
        if (hasOneSidedPref) {
          score -= 50;
        }

        // People who ARE preferred by others - should stay
        const isPreferredByOthers = [...graph.oneSided.values()].some((prefs) =>
          prefs.has(member.personId),
        );
        if (isPreferredByOthers) {
          score -= 30;
        }

        // Later registrations are more likely to be waitlisted
        const regDate = new Date(member.memberStartDate || 0).getTime();
        // Normalize to 0-20 range (newer = higher score)
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        const age = Math.min(now - regDate, maxAge);
        score += Math.round((1 - age / maxAge) * 20);

        // Add small random factor to break ties
        score += Math.random() * 5;

        return { member, score };
      });

      // Sort by score descending (highest scores get waitlisted)
      waitlistScores.sort((a, b) => b.score - a.score);

      // Take the top 'excess' members for waitlist
      const toWaitlist = waitlistScores.slice(0, excess).map((s) => s.member);
      waitlistedPersonIds.push(...toWaitlist.map((m) => m.personId));

      // Remove waitlisted members from working set
      const waitlistIds = new Set(waitlistedPersonIds);
      workingMembers = activeMembers.filter(
        (m) => !waitlistIds.has(m.personId),
      );

      // Warn if we had to waitlist someone with preferences
      toWaitlist.forEach((m) => {
        if (graph.mutual.has(m.personId)) {
          warnings.push(
            `${m.person.firstName} ${m.person.lastName} was waitlisted despite having mutual partner preferences`,
          );
        }
      });
    }

    // Rebuild preference graph with only working members
    const workingGraph = this.buildPreferenceGraph(workingMembers);

    // Shuffle working members for randomization in group formation
    workingMembers = shuffleArray(workingMembers);

    // Group members by meal preference
    const mealBuckets = this.groupByMealPreference(workingMembers);

    // Calculate how many people we need per meal
    const peoplePerMeal = groupsPerMeal * eventMetadata.preferredGroupSize;

    // Balance meal buckets - move excess people to meals that need more
    this.balanceMealBuckets(mealBuckets, peoplePerMeal, workingGraph, warnings);

    // Now create groups within each meal bucket
    const groups: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    let groupNumber = 1;
    const meals: MealType[] = ['starter', 'mainCourse', 'dessert'];

    for (const meal of meals) {
      const bucket = mealBuckets.get(meal)!;
      const mealGroups = this.createGroupsFromBucket(
        bucket,
        meal,
        eventMetadata,
        workingGraph,
        groupNumber,
        warnings,
      );

      groups.push(...mealGroups);
      groupNumber += mealGroups.length;
    }

    // Assign hosts randomly within each group
    groups.forEach((group) => {
      const shuffledMembers = shuffleArray([...group.memberPersonIds]);
      group.hostPersonId = shuffledMembers[0];
    });

    // Check for partner preference mismatches
    this.checkPreferenceMismatches(
      groups,
      workingMembers,
      workingGraph,
      warnings,
    );

    return {
      dinnerGroups: groups,
      warnings,
      waitlistedPersonIds,
    };
  }

  /**
   * Group members by their meal preference
   */
  private groupByMealPreference(
    members: GroupMember[],
  ): Map<MealType, GroupMember[]> {
    const buckets = new Map<MealType, GroupMember[]>([
      ['starter', []],
      ['mainCourse', []],
      ['dessert', []],
    ]);

    // Shuffle first for randomization
    const shuffled = shuffleArray([...members]);

    shuffled.forEach((member) => {
      const pref = member.fields?.mealPreference;
      if (
        pref &&
        pref !== 'none' &&
        (pref === 'starter' || pref === 'mainCourse' || pref === 'dessert')
      ) {
        buckets.get(pref)!.push(member);
      } else {
        // No preference - will be assigned later during balancing
        // For now, add to a temporary "none" tracking
        // We'll distribute these evenly
      }
    });

    // Collect members without preference
    const withoutPref = shuffled.filter((m) => {
      const pref = m.fields?.mealPreference;
      return !pref || pref === 'none';
    });

    // Distribute members without preference evenly across meals
    const meals: MealType[] = shuffleArray([
      'starter',
      'mainCourse',
      'dessert',
    ] as MealType[]);
    withoutPref.forEach((member, index) => {
      const meal = meals[index % 3];
      buckets.get(meal)!.push(member);
    });

    return buckets;
  }

  /**
   * Balance meal buckets to ensure each has the right number of people
   * Respects partner preferences when moving people between buckets
   */
  private balanceMealBuckets(
    buckets: Map<MealType, GroupMember[]>,
    targetPerMeal: number,
    graph: PreferenceGraph,
    warnings: string[],
  ): void {
    const meals: MealType[] = ['starter', 'mainCourse', 'dessert'];

    // Keep balancing until all buckets are at target size
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops

    while (iterations < maxIterations) {
      iterations++;

      // Find overfilled and underfilled buckets
      const overfilledMeals = meals.filter(
        (m) => buckets.get(m)!.length > targetPerMeal,
      );
      const underfilledMeals = meals.filter(
        (m) => buckets.get(m)!.length < targetPerMeal,
      );

      if (overfilledMeals.length === 0 || underfilledMeals.length === 0) {
        break; // Balanced!
      }

      // Try to move someone from overfilled to underfilled
      let moved = false;

      for (const fromMeal of overfilledMeals) {
        if (moved) break;

        const fromBucket = buckets.get(fromMeal)!;

        for (const toMeal of underfilledMeals) {
          if (moved) break;

          // Find a member to move - prefer those without strong preferences
          // and without mutual partners in the current bucket
          const candidates = shuffleArray([...fromBucket]).sort((a, b) => {
            // Prioritize moving people who:
            // 1. Have no meal preference (or different preference)
            // 2. Have no mutual partners in current bucket

            const aPref = a.fields?.mealPreference;
            const bPref = b.fields?.mealPreference;

            // Score: lower = better candidate to move
            let aScore = 0;
            let bScore = 0;

            // Prefer moving people whose preference doesn't match current bucket
            if (aPref === fromMeal) aScore += 10;
            if (bPref === fromMeal) bScore += 10;

            // Prefer moving people without mutual partners in bucket
            const aMutual = graph.mutual.get(a.personId) || new Set();
            const bMutual = graph.mutual.get(b.personId) || new Set();
            const bucketIds = new Set(fromBucket.map((m) => m.personId));

            const aMutualInBucket = [...aMutual].filter((id) =>
              bucketIds.has(id),
            ).length;
            const bMutualInBucket = [...bMutual].filter((id) =>
              bucketIds.has(id),
            ).length;

            aScore += aMutualInBucket * 5;
            bScore += bMutualInBucket * 5;

            return aScore - bScore;
          });

          // Move the best candidate
          if (candidates.length > 0) {
            const toMove = candidates[0];
            const index = fromBucket.findIndex(
              (m) => m.personId === toMove.personId,
            );
            if (index !== -1) {
              fromBucket.splice(index, 1);
              buckets.get(toMeal)!.push(toMove);
              moved = true;

              // Warn if we moved someone away from their preference
              const pref = toMove.fields?.mealPreference;
              if (pref === fromMeal) {
                warnings.push(
                  `${toMove.person.firstName} ${toMove.person.lastName} moved from preferred ${fromMeal} to ${toMeal} for balance`,
                );
              }
            }
          }
        }
      }

      if (!moved) {
        // Couldn't move anyone - break to avoid infinite loop
        warnings.push('Could not perfectly balance meal assignments');
        break;
      }
    }
  }

  /**
   * Create groups from a meal bucket, respecting partner preferences
   */
  private createGroupsFromBucket(
    bucket: GroupMember[],
    meal: MealType,
    eventMetadata: EventMetadata,
    graph: PreferenceGraph,
    startingGroupNumber: number,
    warnings: string[],
  ): Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[] {
    const groups: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const assigned = new Set<number>();
    let groupNumber = startingGroupNumber;

    // Shuffle bucket for randomization
    const shuffledBucket = shuffleArray([...bucket]);

    // First pass: Create groups starting with mutual preferences
    const mutualPersonIds = shuffleArray(
      [...graph.mutual.keys()].filter((id) =>
        shuffledBucket.some((m) => m.personId === id),
      ),
    );

    for (const personId of mutualPersonIds) {
      if (assigned.has(personId)) continue;

      // Check if this person is in our bucket
      const person = shuffledBucket.find((m) => m.personId === personId);
      if (!person) continue;

      const groupMembers: number[] = [personId];
      assigned.add(personId);

      // Add mutual partners that are also in this bucket
      const mutualPartners = graph.mutual.get(personId) || new Set();
      const shuffledPartners = shuffleArray([...mutualPartners]);

      for (const partnerId of shuffledPartners) {
        if (assigned.has(partnerId)) continue;
        if (!shuffledBucket.some((m) => m.personId === partnerId)) continue;
        if (groupMembers.length >= eventMetadata.preferredGroupSize) break;

        groupMembers.push(partnerId);
        assigned.add(partnerId);
      }

      // Fill with one-sided preferences from bucket
      if (groupMembers.length < eventMetadata.preferredGroupSize) {
        const oneSided = graph.oneSided.get(personId) || new Set();
        const shuffledOneSided = shuffleArray([...oneSided]);

        for (const prefId of shuffledOneSided) {
          if (assigned.has(prefId)) continue;
          if (!shuffledBucket.some((m) => m.personId === prefId)) continue;
          if (groupMembers.length >= eventMetadata.preferredGroupSize) break;

          groupMembers.push(prefId);
          assigned.add(prefId);
        }
      }

      // Fill remaining spots with anyone from bucket
      if (groupMembers.length < eventMetadata.preferredGroupSize) {
        for (const m of shuffledBucket) {
          if (assigned.has(m.personId)) continue;
          if (groupMembers.length >= eventMetadata.preferredGroupSize) break;

          groupMembers.push(m.personId);
          assigned.add(m.personId);
        }
      }

      if (groupMembers.length === eventMetadata.preferredGroupSize) {
        groups.push({
          eventMetadataId: eventMetadata.id!,
          ctGroupId: eventMetadata.groupId,
          groupNumber: groupNumber++,
          memberPersonIds: groupMembers,
          assignedMeal: meal,
        });
      }
    }

    // Second pass: Create groups from remaining unassigned members
    const unassigned = shuffledBucket.filter((m) => !assigned.has(m.personId));

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
          assignedMeal: meal,
        });
      } else if (groupMembers.length > 0) {
        warnings.push(
          `Incomplete ${meal} group with ${groupMembers.length} members (expected ${eventMetadata.preferredGroupSize})`,
        );
      }
    }

    return groups;
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
