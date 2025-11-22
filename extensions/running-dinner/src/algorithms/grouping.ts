import type {
  RunningDinner,
  Participant,
  Group,
  MealType,
} from '../types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import { getCurrentTimestamp } from '../types/models';

export interface GroupingResult {
  groups: Omit<Group, 'id'>[];
  warnings: string[];
  waitlistedParticipantIds: number[];
}

interface PreferenceGraph {
  mutual: Map<number, Set<number>>; // Bidirectional preferences
  oneSided: Map<number, Set<number>>; // Unidirectional preferences
}

/**
 * Create groups from participants respecting preferences and meal assignments
 */
export function createGroups(
  dinner: RunningDinner,
  participants: CategoryValue<Participant>[],
): GroupingResult {
  const warnings: string[] = [];
  const waitlistedParticipantIds: number[] = [];

  // Filter out cancelled/waitlist participants
  const activeParticipants = participants.filter(
    (p) =>
      p.value.registrationStatus === 'pending' ||
      p.value.registrationStatus === 'confirmed',
  );

  // Validate minimum participants
  const minParticipants = 3 * dinner.preferredGroupSize;
  if (activeParticipants.length < minParticipants) {
    throw new Error(
      `Need at least ${minParticipants} participants (3 meals × ${dinner.preferredGroupSize} people per group). Currently have ${activeParticipants.length}.`,
    );
  }

  // Calculate ideal number of groups (must be multiple of 3)
  const idealGroupCount = Math.floor(
    activeParticipants.length / dinner.preferredGroupSize,
  );
  const needsMultipleOf3 = idealGroupCount - (idealGroupCount % 3);
  const idealParticipantCount = needsMultipleOf3 * dinner.preferredGroupSize;

  // Handle excess participants
  let workingParticipants = [...activeParticipants];
  if (activeParticipants.length > idealParticipantCount) {
    const excess = activeParticipants.length - idealParticipantCount;
    warnings.push(
      `${excess} participant(s) moved to waitlist to achieve group balance (need multiple of 3 groups)`,
    );

    // Sort by registration date (latest first) to waitlist most recent
    workingParticipants.sort(
      (a, b) =>
        new Date(b.value.registeredAt).getTime() -
        new Date(a.value.registeredAt).getTime(),
    );

    // Move excess to waitlist
    const toWaitlist = workingParticipants.splice(0, excess);
    waitlistedParticipantIds.push(...toWaitlist.map((p) => p.id!));
  }

  // Build preference graph
  const graph = buildPreferenceGraph(workingParticipants);

  // Create groups using greedy algorithm
  const groups: Omit<Group, 'id'>[] = [];
  const assigned = new Set<number>();
  let groupNumber = 1;

  // Step 1: Process mutual preferences first
  for (const [participantId, mutualPartners] of graph.mutual) {
    if (assigned.has(participantId)) continue;

    const groupMembers: number[] = [participantId];
    assigned.add(participantId);

    // Add mutual partners
    for (const partnerId of mutualPartners) {
      if (
        !assigned.has(partnerId) &&
        groupMembers.length < dinner.preferredGroupSize
      ) {
        groupMembers.push(partnerId);
        assigned.add(partnerId);
      }
    }

    // If group is smaller than preferred, try to add one-sided preferences
    if (groupMembers.length < dinner.preferredGroupSize) {
      const oneSidedPrefs = graph.oneSided.get(participantId) || new Set();
      for (const preferredId of oneSidedPrefs) {
        if (
          !assigned.has(preferredId) &&
          groupMembers.length < dinner.preferredGroupSize
        ) {
          groupMembers.push(preferredId);
          assigned.add(preferredId);
        }
      }
    }

    // Fill group with unassigned singles
    if (groupMembers.length < dinner.preferredGroupSize) {
      for (const p of workingParticipants) {
        if (
          !assigned.has(p.id!) &&
          groupMembers.length < dinner.preferredGroupSize
        ) {
          groupMembers.push(p.id!);
          assigned.add(p.id!);
        }
      }
    }

    if (groupMembers.length === dinner.preferredGroupSize) {
      groups.push({
        dinnerId: dinner.id!,
        groupNumber: groupNumber++,
        participantIds: groupMembers,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      });
    } else {
      warnings.push(
        `Group ${groupNumber - 1} has ${groupMembers.length} members (expected ${dinner.preferredGroupSize})`,
      );
    }
  }

  // Step 2: Create groups from remaining unassigned participants
  const unassigned = workingParticipants.filter((p) => !assigned.has(p.id!));
  for (let i = 0; i < unassigned.length; i += dinner.preferredGroupSize) {
    const groupMembers = unassigned
      .slice(i, i + dinner.preferredGroupSize)
      .map((p) => p.id!);

    if (groupMembers.length === dinner.preferredGroupSize) {
      groups.push({
        dinnerId: dinner.id!,
        groupNumber: groupNumber++,
        participantIds: groupMembers,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      });
    } else if (groupMembers.length > 0) {
      warnings.push(
        `Incomplete group with ${groupMembers.length} members (expected ${dinner.preferredGroupSize})`,
      );
    }
  }

  // Step 3: Assign meals to groups
  const groupsWithMeals = assignMeals(
    groups,
    workingParticipants,
    dinner,
    warnings,
  );

  // Check for preference mismatches
  checkPreferenceMismatches(
    groupsWithMeals,
    workingParticipants,
    graph,
    warnings,
  );

  return {
    groups: groupsWithMeals,
    warnings,
    waitlistedParticipantIds,
  };
}

/**
 * Build preference graph from participants
 */
function buildPreferenceGraph(
  participants: CategoryValue<Participant>[],
): PreferenceGraph {
  const mutual = new Map<number, Set<number>>();
  const oneSided = new Map<number, Set<number>>();
  const emailToId = new Map<string, number>();

  // Build email to ID mapping
  participants.forEach((p) => {
    emailToId.set(p.value.email.toLowerCase(), p.id!);
  });

  // Process preferences
  participants.forEach((p) => {
    const participantId = p.id!;

    p.value.preferredPartners.forEach((partnerEmail) => {
      const partnerId = emailToId.get(partnerEmail.toLowerCase());
      if (!partnerId) return; // Partner not registered

      // Check if preference is mutual
      const partner = participants.find((pp) => pp.id === partnerId);
      if (
        partner &&
        partner.value.preferredPartners
          .map((e) => e.toLowerCase())
          .includes(p.value.email.toLowerCase())
      ) {
        // Mutual preference
        if (!mutual.has(participantId)) mutual.set(participantId, new Set());
        if (!mutual.has(partnerId)) mutual.set(partnerId, new Set());
        mutual.get(participantId)!.add(partnerId);
        mutual.get(partnerId)!.add(participantId);
      } else {
        // One-sided preference
        if (!oneSided.has(participantId))
          oneSided.set(participantId, new Set());
        oneSided.get(participantId)!.add(partnerId);
      }
    });
  });

  return { mutual, oneSided };
}

/**
 * Assign meals to groups, respecting preferences but forcing assignments if needed
 */
function assignMeals(
  groups: Omit<Group, 'id'>[],
  participants: CategoryValue<Participant>[],
  _dinner: RunningDinner,
  warnings: string[],
): Omit<Group, 'id'>[] {
  const mealsPerGroup = groups.length / 3;

  if (groups.length % 3 !== 0) {
    warnings.push(
      `Group count (${groups.length}) is not divisible by 3. Meal assignment may be unbalanced.`,
    );
  }

  // Count meal preferences
  const mealPreferences = new Map<number, MealType | undefined>();
  groups.forEach((group) => {
    // Use first participant's preference as group preference
    const firstParticipant = participants.find(
      (p) => p.id === group.participantIds[0],
    );
    if (firstParticipant?.value.preferredMeal) {
      mealPreferences.set(
        group.groupNumber,
        firstParticipant.value.preferredMeal,
      );
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

  // Assign host (first participant in each group)
  groups.forEach((group) => {
    group.hostParticipantId = group.participantIds[0];
  });

  return groups;
}

/**
 * Check for preference mismatches and add warnings
 */
function checkPreferenceMismatches(
  groups: Omit<Group, 'id'>[],
  participants: CategoryValue<Participant>[],
  graph: PreferenceGraph,
  warnings: string[],
): void {
  groups.forEach((group) => {
    group.participantIds.forEach((participantId) => {
      const participant = participants.find((p) => p.id === participantId);
      if (!participant) return;

      // Check if any preferred partners are not in this group
      const preferredInGroup = new Set(group.participantIds);
      const mutual = graph.mutual.get(participantId) || new Set();

      const unmatchedMutual = [...mutual].filter(
        (id) => !preferredInGroup.has(id),
      );

      if (unmatchedMutual.length > 0) {
        warnings.push(
          `${participant.value.name} has mutual preferences not in their group`,
        );
      }
    });
  });
}
