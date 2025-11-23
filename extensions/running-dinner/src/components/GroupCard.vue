<template>
  <Card class="group-card">
    <template #title>
      <div class="flex items-center justify-between">
        <span>Group {{ group.groupNumber }}</span>
        <Badge
          v-if="group.assignedMeal"
          :value="getMealLabel(group.assignedMeal)"
          :severity="getMealSeverity(group.assignedMeal)"
        />
      </div>
    </template>
    <template #content>
      <div class="space-y-3">
        <!-- Members List -->
        <div>
          <div class="font-medium text-sm mb-2">Members:</div>
          <div class="space-y-2">
            <div
              v-for="participant in members"
              :key="participant.id"
              class="flex items-center gap-2 p-2 rounded bg-surface-50 dark:bg-surface-800"
            >
              <i
                v-if="participant.id === group.hostParticipantId"
                class="pi pi-home text-primary"
                title="Host"
              ></i>
              <div class="flex-1">
                <div class="font-medium">{{ participant.value.name }}</div>
                <div class="text-sm text-surface-600 dark:text-surface-400">
                  {{ participant.value.email }}
                </div>
                <div
                  v-if="participant.value.phone"
                  class="text-sm text-surface-600 dark:text-surface-400"
                >
                  {{ participant.value.phone }}
                </div>
              </div>
              <div v-if="editable" class="flex gap-1">
                <SecondaryButton
                  v-if="participant.id !== group.hostParticipantId"
                  icon="pi pi-home"
                  size="small"
                  outlined
                  @click="$emit('set-host', participant.id!)"
                  title="Set as host"
                />
                <DangerButton
                  icon="pi pi-times"
                  size="small"
                  outlined
                  @click="$emit('remove-member', participant.id!)"
                  title="Remove from group"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Host Address (if host is assigned) -->
        <div
          v-if="hostParticipant"
          class="pt-2 border-t border-surface-200 dark:border-surface-700"
        >
          <div class="font-medium text-sm mb-2">Host Address:</div>
          <div class="text-sm">
            <div>
              {{ hostParticipant.value.address.street }},
              {{ hostParticipant.value.address.zip }}
              {{ hostParticipant.value.address.city }}
            </div>
          </div>
        </div>

        <!-- Dietary Restrictions -->
        <div
          v-if="dietaryRestrictions.length > 0"
          class="pt-2 border-t border-surface-200 dark:border-surface-700"
        >
          <div class="font-medium text-sm mb-2">Dietary Restrictions:</div>
          <div class="space-y-1">
            <div
              v-for="(restriction, idx) in dietaryRestrictions"
              :key="idx"
              class="text-sm"
            >
              <span class="font-medium">{{ restriction.name }}:</span>
              {{ restriction.restriction }}
            </div>
          </div>
        </div>

        <!-- Meal Preferences -->
        <div
          v-if="mealPreferences.length > 0"
          class="pt-2 border-t border-surface-200 dark:border-surface-700"
        >
          <div class="font-medium text-sm mb-2">Meal Preferences:</div>
          <div class="space-y-1">
            <div
              v-for="(preference, idx) in mealPreferences"
              :key="idx"
              class="flex items-center gap-2 text-sm"
            >
              <span class="font-medium">{{ preference.name }}:</span>
              <Chip :label="getMealLabel(preference.meal)" size="small" />
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div
          v-if="editable"
          class="pt-2 border-t border-surface-200 dark:border-surface-700"
        >
          <div class="flex gap-2">
            <Button
              label="Delete Group"
              icon="pi pi-trash"
              size="small"
              severity="danger"
              outlined
              @click="$emit('delete')"
            />
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Group, Participant, MealType } from '../types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';

interface Props {
  group: Group;
  participants: CategoryValue<Participant>[];
  editable?: boolean;
}

interface Emits {
  (e: 'set-host', participantId: number): void;
  (e: 'remove-member', participantId: number): void;
  (e: 'delete'): void;
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
});

defineEmits<Emits>();

const members = computed(() => {
  return props.participants.filter((p) =>
    props.group.participantIds.includes(p.id!),
  );
});

const hostParticipant = computed(() => {
  if (!props.group.hostParticipantId) return null;
  return props.participants.find((p) => p.id === props.group.hostParticipantId);
});

const dietaryRestrictions = computed(() => {
  return members.value
    .filter((p) => p.value.dietaryRestrictions)
    .map((p) => ({
      name: p.value.name,
      restriction: p.value.dietaryRestrictions,
    }));
});

const mealPreferences = computed(() => {
  return members.value
    .filter((p) => p.value.preferredMeal)
    .map((p) => ({
      name: p.value.name,
      meal: p.value.preferredMeal as MealType,
    }));
});

function getMealLabel(meal: MealType): string {
  const labels: Record<MealType, string> = {
    starter: 'Starter',
    mainCourse: 'Main Course',
    dessert: 'Dessert',
  };
  return labels[meal];
}

function getMealSeverity(meal: MealType): string {
  const severities: Record<MealType, string> = {
    starter: 'success',
    mainCourse: 'warn',
    dessert: 'info',
  };
  return severities[meal];
}
</script>

<style scoped>
.group-card {
  height: 100%;
}
</style>
