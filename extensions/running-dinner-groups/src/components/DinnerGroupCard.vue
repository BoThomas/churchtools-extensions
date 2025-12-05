<template>
  <Card
    class="h-full"
    pt:root:class="flex flex-col"
    pt:body:class="flex-1 flex flex-col"
    pt:content:class="flex-1"
  >
    <template #title>
      <div class="flex items-center justify-between">
        <span>Group {{ group.groupNumber }}</span>
        <div class="flex items-center gap-1">
          <Badge
            v-if="group.assignedMeal"
            :value="getMealLabel(group.assignedMeal)"
            :severity="getMealSeverity(group.assignedMeal)"
          />
          <Badge
            v-if="isDessertAtAfterParty"
            value="@ After Party"
            severity="warn"
            v-tooltip="
              'This group prepares dessert at home and brings it to the after party location'
            "
          />
        </div>
      </div>
    </template>
    <template #content>
      <div class="space-y-3">
        <!-- Info banner for dessert at after party -->
        <div
          v-if="isDessertAtAfterParty"
          class="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
        >
          <div
            class="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-300"
          >
            <i class="pi pi-info-circle mt-0.5"></i>
            <span
              >Prepares dessert at home and brings it to the after party
              location.</span
            >
          </div>
        </div>

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
                v-if="
                  member.personId === group.hostPersonId &&
                  !isDessertAtAfterParty
                "
                class="pi pi-home text-primary"
                v-tooltip="'Host'"
              ></i>
              <i
                v-else-if="
                  member.personId === group.hostPersonId &&
                  isDessertAtAfterParty
                "
                class="pi pi-star-fill text-yellow-500"
                v-tooltip="'Prepares dessert for this group'"
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
                  v-tooltip="
                    isDessertAtAfterParty
                      ? 'Set as dessert preparer'
                      : 'Set as host'
                  "
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

        <!-- Host Address (if host is assigned) - only show for regular hosting, not dessert at after party -->
        <div
          v-if="hostMember && hostAddress && !isDessertAtAfterParty"
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
              :class="
                restriction.isAllergy
                  ? 'text-orange-600 dark:text-orange-400'
                  : ''
              "
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
          <div class="space-y-1">
            <div
              v-for="(pref, idx) in mealPreferences"
              :key="idx"
              class="text-sm"
            >
              <span class="font-medium">{{ pref.name }}:</span>
              {{ getMealLabel(pref.meal) }}
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-if="editable" #footer>
      <div class="flex justify-end">
        <Button
          label="Delete Group"
          icon="pi pi-trash"
          size="small"
          severity="danger"
          text
          @click="$emit('delete')"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DinnerGroup, GroupMember } from '@/types/models';
import { getMealLabel, getMealSeverity } from '@/types/models';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';

const props = defineProps<{
  group: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>;
  members: GroupMember[];
  editable?: boolean;
  isDessertAtAfterParty?: boolean;
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
  const restrictions: {
    name: string;
    restriction: string;
    isAllergy: boolean;
  }[] = [];
  groupMembers.value.forEach((m) => {
    if (m.fields?.dietaryRestrictions) {
      restrictions.push({
        name: m.person.firstName,
        restriction: m.fields.dietaryRestrictions,
        isAllergy: false,
      });
    }
    if (m.fields?.allergyInfo) {
      restrictions.push({
        name: m.person.firstName,
        restriction: m.fields.allergyInfo,
        isAllergy: true,
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
</script>
