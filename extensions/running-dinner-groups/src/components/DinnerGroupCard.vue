<template>
  <Card class="h-full">
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
          <div
            class="font-medium text-sm mb-2 text-surface-600 dark:text-surface-400"
          >
            Members ({{ group.memberPersonIds.length }}):
          </div>
          <div class="space-y-2">
            <div
              v-for="member in groupMembers"
              :key="member.personId"
              class="flex items-center gap-2 p-2 rounded bg-surface-50 dark:bg-surface-800"
            >
              <i
                v-if="member.personId === group.hostPersonId"
                class="pi pi-home text-primary"
                v-tooltip="'Host'"
              ></i>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">
                  {{ member.person.firstName }} {{ member.person.lastName }}
                </div>
                <div class="text-xs text-surface-500 truncate">
                  {{ member.person.email }}
                </div>
              </div>
              <div v-if="editable" class="flex gap-1 shrink-0">
                <Button
                  v-if="member.personId !== group.hostPersonId"
                  icon="pi pi-home"
                  size="small"
                  text
                  severity="secondary"
                  @click="$emit('set-host', member.personId)"
                  v-tooltip="'Set as host'"
                />
                <Button
                  icon="pi pi-times"
                  size="small"
                  text
                  severity="danger"
                  @click="$emit('remove-member', member.personId)"
                  v-tooltip="'Remove'"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Host Address (if host is assigned) -->
        <div
          v-if="hostMember && hostAddress"
          class="pt-2 border-t border-surface-200 dark:border-surface-700"
        >
          <div
            class="font-medium text-sm mb-1 text-surface-600 dark:text-surface-400"
          >
            Host Address:
          </div>
          <div class="text-sm">
            {{ hostAddress }}
          </div>
        </div>

        <!-- Dietary Restrictions -->
        <div
          v-if="dietaryRestrictions.length > 0"
          class="pt-2 border-t border-surface-200 dark:border-surface-700"
        >
          <div
            class="font-medium text-sm mb-1 text-surface-600 dark:text-surface-400"
          >
            Dietary Notes:
          </div>
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
          <div
            class="font-medium text-sm mb-1 text-surface-600 dark:text-surface-400"
          >
            Meal Preferences:
          </div>
          <div class="flex flex-wrap gap-1">
            <Chip
              v-for="(pref, idx) in mealPreferences"
              :key="idx"
              :label="`${pref.name}: ${getMealLabel(pref.meal)}`"
              class="text-xs"
            />
          </div>
        </div>

        <!-- Actions -->
        <div
          v-if="editable"
          class="pt-2 border-t border-surface-200 dark:border-surface-700"
        >
          <Button
            label="Delete Group"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            text
            @click="$emit('delete')"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DinnerGroup, GroupMember } from '@/types/models';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';

const props = defineProps<{
  group: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>;
  members: GroupMember[];
  editable?: boolean;
}>();

defineEmits<{
  'set-host': [personId: number];
  'remove-member': [personId: number];
  delete: [];
}>();

// Computed
const groupMembers = computed(() =>
  props.members.filter((m) => props.group.memberPersonIds.includes(m.personId)),
);

const hostMember = computed(() =>
  props.group.hostPersonId
    ? groupMembers.value.find((m) => m.personId === props.group.hostPersonId)
    : null,
);

const hostAddress = computed(() => {
  if (!hostMember.value?.person.addresses?.[0]) return null;
  const addr = hostMember.value.person.addresses[0];
  return [addr.street, addr.zip, addr.city].filter(Boolean).join(', ');
});

const dietaryRestrictions = computed(() => {
  const restrictions: { name: string; restriction: string }[] = [];
  groupMembers.value.forEach((m) => {
    if (m.fields?.dietaryRestrictions) {
      restrictions.push({
        name: m.person.firstName,
        restriction: m.fields.dietaryRestrictions,
      });
    }
    if (m.fields?.allergyInfo) {
      restrictions.push({
        name: `${m.person.firstName} ⚠️`,
        restriction: m.fields.allergyInfo,
      });
    }
  });
  return restrictions;
});

const mealPreferences = computed(() => {
  const prefs: { name: string; meal: string }[] = [];
  groupMembers.value.forEach((m) => {
    if (m.fields?.mealPreference && m.fields.mealPreference !== 'none') {
      prefs.push({
        name: m.person.firstName,
        meal: m.fields.mealPreference,
      });
    }
  });
  return prefs;
});

// Helpers
function getMealLabel(meal: string): string {
  const labels: Record<string, string> = {
    starter: 'Starter',
    mainCourse: 'Main Course',
    dessert: 'Dessert',
  };
  return labels[meal] || meal;
}

function getMealSeverity(
  meal: string,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  const severities: Record<
    string,
    'success' | 'info' | 'warn' | 'danger' | 'secondary'
  > = {
    starter: 'info',
    mainCourse: 'success',
    dessert: 'warn',
  };
  return severities[meal] || 'secondary';
}
</script>
