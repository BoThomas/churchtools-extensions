<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
    </div>

    <!-- Error State -->
    <Message v-else-if="error" severity="error">
      {{ error }}
    </Message>

    <!-- Group Selection -->
    <div v-else class="space-y-4">
      <div class="flex flex-col gap-2">
        <label for="group-select" class="font-medium text-sm">
          Select ChurchTools Group
        </label>
        <Select
          id="group-select"
          v-model="selectedGroup"
          :options="filteredGroups"
          option-label="name"
          placeholder="Choose a group..."
          :filter="true"
          filter-placeholder="Search groups..."
          class="w-full"
        >
          >
          <template #value="slotProps">
            <div v-if="slotProps.value" class="flex items-center gap-2">
              <i class="pi pi-users"></i>
              <span>{{ slotProps.value.name }}</span>
              <Badge
                v-if="slotProps.value.memberStatistics"
                :value="getMemberCount(slotProps.value)"
                severity="info"
              />
            </div>
            <span v-else>{{ slotProps.placeholder }}</span>
          </template>
          <template #option="slotProps">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-2">
                <i class="pi pi-users"></i>
                <span>{{ slotProps.option.name }}</span>
              </div>
              <Badge
                v-if="slotProps.option.memberStatistics"
                :value="getMemberCount(slotProps.option)"
                severity="info"
              />
            </div>
          </template>
          >
        </Select>
        <small class="text-surface-600 dark:text-surface-400">
          Select a ChurchTools group to create a dinner event and automatically
          add all members as participants.
        </small>
      </div>

      <!-- Selected Group Details -->
      <Fieldset
        v-if="selectedGroup"
        :legend="selectedGroup.name"
        class="bg-primary-50 dark:bg-primary-900/20"
      >
        <div class="space-y-4">
          <div
            v-if="selectedGroup.information?.note"
            class="text-sm text-surface-600 dark:text-surface-400"
          >
            {{ selectedGroup.information.note }}
          </div>

          <div class="flex items-center gap-4 text-sm flex-wrap">
            <div v-if="selectedGroup.memberStatistics">
              <i class="pi pi-users mr-1"></i>
              <span class="font-medium">{{
                getMemberCount(selectedGroup)
              }}</span>
              {{ getMemberCount(selectedGroup) === 1 ? 'member' : 'members' }}
            </div>
            <div v-if="selectedGroup.information?.meetingTime">
              <i class="pi pi-clock mr-1"></i>
              {{ selectedGroup.information.meetingTime }}
            </div>
          </div>

          <!-- Members List -->
          <div v-if="loadingMembers" class="text-center py-4">
            <i class="pi pi-spin pi-spinner text-2xl text-primary"></i>
          </div>
          <div v-else-if="groupMembers.length > 0" class="space-y-2">
            <div class="font-medium text-sm">
              Members to be added as participants:
            </div>
            <DataTable
              :value="groupMembers"
              :rows="5"
              :paginator="groupMembers.length > 5"
              size="small"
              class="text-sm"
            >
              <template #empty>
                <div class="text-center py-2 text-surface-500">
                  No members found
                </div>
              </template>
              <Column header="Name">
                <template #body="slotProps">
                  {{ slotProps.data.person.title }}
                </template>
              </Column>
              <Column header="Status">
                <template #body="slotProps">
                  <Badge
                    :value="slotProps.data.groupMemberStatus"
                    :severity="
                      slotProps.data.groupMemberStatus === 'active'
                        ? 'success'
                        : 'secondary'
                    "
                  />
                </template>
              </Column>
            </DataTable>
          </div>
          <div
            v-else
            class="text-sm text-surface-600 dark:text-surface-400 py-2"
          >
            No members in this group
          </div>
        </div>
      </Fieldset>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-2 pt-4">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="$emit('cancel')"
        />
        <Button
          label="Continue"
          icon="pi pi-arrow-right"
          :disabled="!selectedGroup"
          @click="handleContinue"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type {
  Group,
  GroupMember,
} from '@churchtools-extensions/ct-utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import DataTable from '@churchtools-extensions/prime-volt/DataTable.vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import Column from 'primevue/column';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';

const emit = defineEmits<{
  continue: [group: Group];
  cancel: [];
}>();

const loading = ref(true);
const loadingMembers = ref(false);
const error = ref<string | null>(null);
const groups = ref<Group[]>([]);
const selectedGroup = ref<Group | null>(null);
const groupMembers = ref<GroupMember[]>([]);

const filteredGroups = computed(() => {
  // Filter out groups that are hidden or not active
  if (!groups.value) return [];
  return groups.value.filter((group) => {
    const isActive =
      !group.information?.endDate ||
      new Date(group.information.endDate) > new Date();
    const isNotHidden = !group.settings?.isHidden;
    return isActive && isNotHidden;
  });
});

onMounted(async () => {
  try {
    loading.value = true;
    // Fetch all groups from ChurchTools with memberStatistics included
    const response = await churchtoolsClient.get(
      '/groups?include[]=memberStatistics',
    );

    // ChurchTools API might return data directly or wrapped in { data: [...] }
    if (Array.isArray(response)) {
      groups.value = response as Group[];
    } else if (response && typeof response === 'object' && 'data' in response) {
      groups.value = (response as { data: Group[] }).data;
    } else {
      console.error('Unexpected response format:', response);
      groups.value = [];
    }
  } catch (e) {
    console.error('Failed to fetch groups', e);
    error.value = 'Failed to load ChurchTools groups. Please try again.';
  } finally {
    loading.value = false;
  }
});

// Watch for selected group changes and fetch members
watch(selectedGroup, async (newGroup) => {
  if (!newGroup) {
    groupMembers.value = [];
    return;
  }

  try {
    loadingMembers.value = true;
    // Fetch all pages of members - ChurchTools returns array directly with max 10 per page
    let allMembers: GroupMember[] = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const response = await churchtoolsClient.get(
        `/groups/${newGroup.id}/members?page=${page}`,
      );

      // ChurchTools returns the array directly, not wrapped in data
      let pageMembers: GroupMember[] = [];
      if (Array.isArray(response)) {
        pageMembers = response as GroupMember[];
      } else if (
        response &&
        typeof response === 'object' &&
        'data' in response
      ) {
        pageMembers = (response as { data: GroupMember[] }).data || [];
      } else {
        console.error('Unexpected members response format:', response);
        break;
      }

      if (pageMembers.length === 0) {
        hasMorePages = false;
      } else {
        allMembers.push(...pageMembers);
        // If we got less than 10 members, we've reached the last page
        if (pageMembers.length < 10) {
          hasMorePages = false;
        } else {
          page++;
        }
      }
    }

    groupMembers.value = allMembers;
  } catch (e: any) {
    console.error('Failed to fetch group members', e);
    console.error('Error response:', e.response?.data);
    groupMembers.value = [];
  } finally {
    loadingMembers.value = false;
  }
});

function getMemberCount(group: Group): number {
  if (!group.memberStatistics) return 0;
  // The 'active' field represents all active members (including leaders and participants)
  return group.memberStatistics.active || 0;
}

function handleContinue() {
  if (selectedGroup.value) {
    emit('continue', selectedGroup.value);
  }
}
</script>
