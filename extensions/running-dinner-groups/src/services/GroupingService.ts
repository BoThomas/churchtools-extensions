import type {
  EventMetadata,
  DinnerGroup,
  GroupMember,
  MealType,
} from '@/types/models';
import { shuffleArray } from '@/utils/array';

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

    // Group members by meal preference, considering partner preferences
    const mealBuckets = this.groupByMealPreference(
      workingMembers,
      workingGraph,
    );

    // Calculate how many people we need per meal
    const peoplePerMeal = groupsPerMeal * eventMetadata.preferredGroupSize;

    // Balance meal buckets - move people WITHOUT partner constraints to balance sizes
    // This is needed because partner clusters may cause uneven distribution
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
   * Group members by their meal preference, keeping partner preferences together
   */
  private groupByMealPreference(
    members: GroupMember[],
    graph: PreferenceGraph,
  ): Map<MealType, GroupMember[]> {
    const buckets = new Map<MealType, GroupMember[]>([
      ['starter', []],
      ['mainCourse', []],
      ['dessert', []],
    ]);

    const assigned = new Set<number>();
    const memberById = new Map(members.map((m) => [m.personId, m]));

    // Helper to get a member's meal preference
    const getMealPref = (member: GroupMember): MealType | null => {
      const pref = member.fields?.mealPreference;
      if (
        pref &&
        pref !== 'none' &&
        (pref === 'starter' || pref === 'mainCourse' || pref === 'dessert')
      ) {
        return pref as MealType;
      }
      return null;
    };

    // Helper to assign a member to a bucket
    const assignToBucket = (member: GroupMember, meal: MealType) => {
      if (assigned.has(member.personId)) return;
      buckets.get(meal)!.push(member);
      assigned.add(member.personId);
      console.log(
        '[PartnerPref] Assigned',
        member.person.firstName,
        member.person.lastName,
        'to',
        meal,
      );
    };

    // Shuffle first for randomization
    const shuffled = shuffleArray([...members]);

    // First pass: Process members with partner preferences together
    // For each member with a partner preference, assign them and their partners to the same bucket
    for (const member of shuffled) {
      if (assigned.has(member.personId)) continue;

      // Check if this member has partner preferences (mutual or one-sided)
      const mutualPartners = graph.mutual.get(member.personId) || new Set();
      const oneSidedPartners = graph.oneSided.get(member.personId) || new Set();
      const allPartners = new Set([...mutualPartners, ...oneSidedPartners]);

      if (allPartners.size === 0) continue; // No partner preferences, handle in second pass

      // Collect all people in this partner cluster (member + all their partners)
      const cluster: GroupMember[] = [member];
      for (const partnerId of allPartners) {
        const partner = memberById.get(partnerId);
        if (partner && !assigned.has(partnerId)) {
          cluster.push(partner);
        }
      }

      // Determine which meal bucket to use for this cluster
      // Priority: mutual partner's preference > member's preference > any preference > random
      let targetMeal: MealType | null = null;

      // First check mutual partners' preferences (highest priority to keep them together)
      for (const partnerId of mutualPartners) {
        const partner = memberById.get(partnerId);
        if (partner) {
          const partnerPref = getMealPref(partner);
          if (partnerPref) {
            targetMeal = partnerPref;
            console.log(
              '[PartnerPref] Using mutual partner',
              partner.person.firstName,
              partner.person.lastName,
              'meal preference:',
              targetMeal,
            );
            break;
          }
        }
      }

      // If no mutual partner has preference, use member's own preference
      if (!targetMeal) {
        targetMeal = getMealPref(member);
        if (targetMeal) {
          console.log(
            '[PartnerPref] Using member',
            member.person.firstName,
            member.person.lastName,
            'own meal preference:',
            targetMeal,
          );
        }
      }

      // If still no preference, check one-sided partners
      if (!targetMeal) {
        for (const partnerId of oneSidedPartners) {
          const partner = memberById.get(partnerId);
          if (partner) {
            const partnerPref = getMealPref(partner);
            if (partnerPref) {
              targetMeal = partnerPref;
              console.log(
                '[PartnerPref] Using one-sided partner',
                partner.person.firstName,
                partner.person.lastName,
                'meal preference:',
                targetMeal,
              );
              break;
            }
          }
        }
      }

      // If still no preference, pick the smallest bucket for balance
      if (!targetMeal) {
        const meals: MealType[] = ['starter', 'mainCourse', 'dessert'];
        targetMeal = meals.reduce((smallest, meal) =>
          buckets.get(meal)!.length < buckets.get(smallest)!.length
            ? meal
            : smallest,
        );
        console.log(
          '[PartnerPref] No meal preference, using smallest bucket:',
          targetMeal,
        );
      }

      // Assign the entire cluster to the target meal
      for (const clusterMember of cluster) {
        assignToBucket(clusterMember, targetMeal);
      }
    }

    // Second pass: Assign remaining members (those without partner preferences)
    for (const member of shuffled) {
      if (assigned.has(member.personId)) continue;

      const pref = getMealPref(member);
      if (pref) {
        assignToBucket(member, pref);
      }
    }

    // Third pass: Distribute remaining members without any preference to smallest buckets
    const withoutPref = shuffled.filter((m) => !assigned.has(m.personId));
    const meals: MealType[] = ['starter', 'mainCourse', 'dessert'];

    for (const member of withoutPref) {
      // Find the smallest bucket and assign there for balance
      const smallestMeal = meals.reduce((smallest, meal) =>
        buckets.get(meal)!.length < buckets.get(smallest)!.length
          ? meal
          : smallest,
      );
      assignToBucket(member, smallestMeal);
    }

    console.log('[PartnerPref] Final bucket sizes:', {
      starter: buckets.get('starter')!.length,
      mainCourse: buckets.get('mainCourse')!.length,
      dessert: buckets.get('dessert')!.length,
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

    // Build a reverse lookup: who is preferred by whom?
    const isPreferredBy = new Map<number, Set<number>>();
    for (const [personId, prefs] of graph.oneSided) {
      for (const prefId of prefs) {
        if (!isPreferredBy.has(prefId)) isPreferredBy.set(prefId, new Set());
        isPreferredBy.get(prefId)!.add(personId);
      }
    }
    for (const [personId, prefs] of graph.mutual) {
      for (const prefId of prefs) {
        if (!isPreferredBy.has(prefId)) isPreferredBy.set(prefId, new Set());
        isPreferredBy.get(prefId)!.add(personId);
      }
    }

    // Keep balancing until all buckets are at target size
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops

    console.log(
      '[PartnerPref] balanceMealBuckets - target per meal:',
      targetPerMeal,
    );

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
        const bucketIds = new Set(fromBucket.map((m) => m.personId));

        for (const toMeal of underfilledMeals) {
          if (moved) break;

          // Find a member to move - prefer those without partner preferences
          const candidates = shuffleArray([...fromBucket]).sort((a, b) => {
            // Score: lower = better candidate to move
            let aScore = 0;
            let bScore = 0;

            // NEVER move someone who has partner preferences in this bucket
            const aOneSided = graph.oneSided.get(a.personId) || new Set();
            const bOneSided = graph.oneSided.get(b.personId) || new Set();
            const aHasPartnerInBucket = [...aOneSided].some((id) =>
              bucketIds.has(id),
            );
            const bHasPartnerInBucket = [...bOneSided].some((id) =>
              bucketIds.has(id),
            );
            if (aHasPartnerInBucket) aScore += 1000; // Very high penalty
            if (bHasPartnerInBucket) bScore += 1000;

            // NEVER move someone who IS preferred by someone else in this bucket
            const aIsPreferredByInBucket = [
              ...(isPreferredBy.get(a.personId) || new Set()),
            ].some((id) => bucketIds.has(id));
            const bIsPreferredByInBucket = [
              ...(isPreferredBy.get(b.personId) || new Set()),
            ].some((id) => bucketIds.has(id));
            if (aIsPreferredByInBucket) aScore += 1000;
            if (bIsPreferredByInBucket) bScore += 1000;

            // Prefer moving people without mutual partners in bucket
            const aMutual = graph.mutual.get(a.personId) || new Set();
            const bMutual = graph.mutual.get(b.personId) || new Set();
            const aMutualInBucket = [...aMutual].filter((id) =>
              bucketIds.has(id),
            ).length;
            const bMutualInBucket = [...bMutual].filter((id) =>
              bucketIds.has(id),
            ).length;
            aScore += aMutualInBucket * 100;
            bScore += bMutualInBucket * 100;

            // Prefer moving people whose preference doesn't match current bucket
            const aPref = a.fields?.mealPreference;
            const bPref = b.fields?.mealPreference;
            if (aPref === fromMeal) aScore += 10;
            if (bPref === fromMeal) bScore += 10;

            return aScore - bScore;
          });

          // Only move if the best candidate has no partner constraints
          const bestCandidate = candidates[0];
          if (bestCandidate) {
            const candidateBucketIds = new Set(
              fromBucket.map((m) => m.personId),
            );
            const oneSided =
              graph.oneSided.get(bestCandidate.personId) || new Set();
            const hasPartnerInBucket = [...oneSided].some((id) =>
              candidateBucketIds.has(id),
            );
            const isPreferredByInBucket = [
              ...(isPreferredBy.get(bestCandidate.personId) || new Set()),
            ].some((id) => candidateBucketIds.has(id));
            const mutual =
              graph.mutual.get(bestCandidate.personId) || new Set();
            const hasMutualInBucket = [...mutual].some((id) =>
              candidateBucketIds.has(id),
            );

            if (
              hasPartnerInBucket ||
              isPreferredByInBucket ||
              hasMutualInBucket
            ) {
              console.log(
                '[PartnerPref] Cannot move',
                bestCandidate.person.firstName,
                bestCandidate.person.lastName,
                '- has partner constraints in bucket',
              );
              continue; // Skip this candidate, try next underfilled meal
            }

            const index = fromBucket.findIndex(
              (m) => m.personId === bestCandidate.personId,
            );
            if (index !== -1) {
              fromBucket.splice(index, 1);
              buckets.get(toMeal)!.push(bestCandidate);
              moved = true;
              console.log(
                '[PartnerPref] Moved',
                bestCandidate.person.firstName,
                bestCandidate.person.lastName,
                'from',
                fromMeal,
                'to',
                toMeal,
              );

              // Warn if we moved someone away from their preference
              const pref = bestCandidate.fields?.mealPreference;
              if (pref === fromMeal) {
                warnings.push(
                  `${bestCandidate.person.firstName} ${bestCandidate.person.lastName} moved from preferred ${fromMeal} to ${toMeal} for balance`,
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
    const bucketPersonIds = new Set(shuffledBucket.map((m) => m.personId));

    console.log(
      '[PartnerPref] createGroupsFromBucket for',
      meal,
      '- bucket size:',
      bucket.length,
    );

    // First pass: Create groups starting with mutual preferences
    const mutualPersonIds = shuffleArray(
      [...graph.mutual.keys()].filter((id) => bucketPersonIds.has(id)),
    );

    console.log(
      '[PartnerPref] Mutual preference person IDs in bucket:',
      mutualPersonIds,
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
        console.log(
          '[PartnerPref] Created group from mutual prefs:',
          groupMembers,
        );
      }
    }

    // Second pass: Process one-sided preferences
    // Find people who have one-sided preferences and try to group them with their preferred partners
    const oneSidedPersonIds = shuffleArray(
      [...graph.oneSided.keys()].filter(
        (id) => bucketPersonIds.has(id) && !assigned.has(id),
      ),
    );

    console.log(
      '[PartnerPref] One-sided preference person IDs in bucket (not yet assigned):',
      oneSidedPersonIds,
    );

    for (const personId of oneSidedPersonIds) {
      if (assigned.has(personId)) continue;

      const person = shuffledBucket.find((m) => m.personId === personId);
      if (!person) continue;

      const groupMembers: number[] = [personId];
      assigned.add(personId);

      // Try to add the people this person prefers
      const preferredPartners = graph.oneSided.get(personId) || new Set();
      const shuffledPreferred = shuffleArray([...preferredPartners]);

      console.log(
        '[PartnerPref] Person',
        personId,
        'prefers:',
        shuffledPreferred,
      );

      for (const prefId of shuffledPreferred) {
        if (assigned.has(prefId)) {
          console.log('[PartnerPref]   Preferred', prefId, 'already assigned');
          continue;
        }
        if (!bucketPersonIds.has(prefId)) {
          console.log(
            '[PartnerPref]   Preferred',
            prefId,
            'not in this meal bucket',
          );
          continue;
        }
        if (groupMembers.length >= eventMetadata.preferredGroupSize) break;

        console.log('[PartnerPref]   Adding preferred partner', prefId);
        groupMembers.push(prefId);
        assigned.add(prefId);
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
        console.log(
          '[PartnerPref] Created group from one-sided prefs:',
          groupMembers,
        );
      }
    }

    // Third pass: Create groups from remaining unassigned members
    const unassigned = shuffledBucket.filter((m) => !assigned.has(m.personId));
    console.log(
      '[PartnerPref] Remaining unassigned:',
      unassigned.map((m) => m.personId),
    );

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
        console.log(
          '[PartnerPref] Created group from unassigned:',
          groupMembers,
        );
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

    // Build lookup maps for matching by email or name
    const emailToId = new Map<string, number>();
    const nameToId = new Map<string, number>();

    console.log(
      '[PartnerPref] Building preference graph for',
      members.length,
      'members',
    );

    members.forEach((m) => {
      if (m.person.email) {
        emailToId.set(m.person.email.toLowerCase(), m.personId);
      }
      // Create full name key: "firstname lastname"
      const fullName = `${m.person.firstName} ${m.person.lastName}`
        .toLowerCase()
        .trim();
      if (fullName) {
        nameToId.set(fullName, m.personId);
      }
    });

    console.log('[PartnerPref] Name lookup map:', Object.fromEntries(nameToId));
    console.log(
      '[PartnerPref] Email lookup map:',
      Object.fromEntries(emailToId),
    );

    /**
     * Try to find a member ID from a preference string (email or name)
     */
    const findMemberId = (prefString: string): number | undefined => {
      const normalized = prefString.toLowerCase().trim();
      console.log(
        '[PartnerPref] findMemberId input:',
        JSON.stringify(prefString),
        '-> normalized:',
        JSON.stringify(normalized),
      );

      // Try email match first
      if (normalized.includes('@')) {
        const result = emailToId.get(normalized);
        console.log(
          '[PartnerPref]   Email match attempt:',
          result !== undefined ? `found ID ${result}` : 'not found',
        );
        return result;
      }

      // Try exact name match
      if (nameToId.has(normalized)) {
        const result = nameToId.get(normalized);
        console.log('[PartnerPref]   Exact name match:', result);
        return result;
      }
      console.log(
        '[PartnerPref]   Exact name match failed for:',
        JSON.stringify(normalized),
      );

      // Try fuzzy name match (handle extra spaces, reversed order)
      const parts = normalized.split(/\s+/).filter(Boolean);
      console.log('[PartnerPref]   Name parts:', parts);
      if (parts.length >= 2) {
        // Try "firstname lastname"
        const nameVariant1 = parts.join(' ');
        console.log(
          '[PartnerPref]   Trying variant1:',
          JSON.stringify(nameVariant1),
        );
        if (nameToId.has(nameVariant1)) {
          const result = nameToId.get(nameVariant1);
          console.log('[PartnerPref]   Variant1 match:', result);
          return result;
        }

        // Try "lastname firstname" (reversed)
        const nameVariant2 = [...parts].reverse().join(' ');
        console.log(
          '[PartnerPref]   Trying variant2 (reversed):',
          JSON.stringify(nameVariant2),
        );
        if (nameToId.has(nameVariant2)) {
          const result = nameToId.get(nameVariant2);
          console.log('[PartnerPref]   Variant2 match:', result);
          return result;
        }
      }

      console.log(
        '[PartnerPref]   No match found for:',
        JSON.stringify(prefString),
      );
      return undefined;
    };

    /**
     * Check if member's preference string contains a reference to another person
     */
    const preferencesContain = (
      prefString: string | undefined,
      targetMember: GroupMember,
    ): boolean => {
      if (!prefString) return false;

      const normalizedPrefs = prefString.toLowerCase();
      const targetFullName =
        `${targetMember.person.firstName} ${targetMember.person.lastName}`.toLowerCase();
      const targetEmail = targetMember.person.email?.toLowerCase();

      console.log(
        '[PartnerPref] preferencesContain check:',
        JSON.stringify(normalizedPrefs),
        'looking for name:',
        JSON.stringify(targetFullName),
        'or email:',
        JSON.stringify(targetEmail),
      );

      // Check if email is mentioned
      if (targetEmail && normalizedPrefs.includes(targetEmail)) {
        console.log('[PartnerPref]   -> Email found in prefs');
        return true;
      }

      // Check if full name is mentioned
      if (normalizedPrefs.includes(targetFullName)) {
        console.log('[PartnerPref]   -> Name found in prefs');
        return true;
      }

      console.log('[PartnerPref]   -> Not found in prefs');
      return false;
    };

    // Process preferences
    members.forEach((m) => {
      const personId = m.personId;
      const partnerPref = m.fields?.partnerPreference;

      console.log(
        '[PartnerPref] Processing member:',
        m.person.firstName,
        m.person.lastName,
        '| partnerPreference field:',
        JSON.stringify(partnerPref),
      );
      console.log('[PartnerPref]   All fields:', JSON.stringify(m.fields));

      if (!partnerPref) return;

      // Parse comma-separated entries (emails or names)
      const partnerEntries = partnerPref
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      console.log('[PartnerPref]   Parsed entries:', partnerEntries);

      partnerEntries.forEach((entry) => {
        const partnerId = findMemberId(entry);
        if (!partnerId) {
          console.log(
            '[PartnerPref]   Entry',
            JSON.stringify(entry),
            '-> Partner not found/registered',
          );
          return;
        }

        console.log(
          '[PartnerPref]   Entry',
          JSON.stringify(entry),
          '-> Found partner ID:',
          partnerId,
        );

        // Check if preference is mutual
        const partner = members.find((mm) => mm.personId === partnerId);
        const partnerPrefs = partner?.fields?.partnerPreference;

        console.log(
          '[PartnerPref]   Checking if mutual. Partner prefs:',
          JSON.stringify(partnerPrefs),
        );

        if (partner && preferencesContain(partnerPrefs, m)) {
          // Mutual preference
          console.log('[PartnerPref]   -> MUTUAL preference detected!');
          if (!mutual.has(personId)) mutual.set(personId, new Set());
          if (!mutual.has(partnerId)) mutual.set(partnerId, new Set());
          mutual.get(personId)!.add(partnerId);
          mutual.get(partnerId)!.add(personId);
        } else {
          // One-sided preference
          console.log('[PartnerPref]   -> One-sided preference');
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
