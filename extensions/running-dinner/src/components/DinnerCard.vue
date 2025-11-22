<template>
  <Card>
    <template #title>
      <div class="flex justify-between items-start">
        <div>
          <h3 class="text-xl font-semibold">{{ dinner.name }}</h3>
          <Badge :value="statusLabel" :severity="statusSeverity" class="mt-2" />
        </div>
        <div class="flex gap-2">
          <Button
            v-if="showActions"
            icon="pi pi-pencil"
            text
            rounded
            @click="$emit('edit', dinner)"
            v-tooltip.top="'Edit'"
          />
          <Button
            v-if="showActions"
            icon="pi pi-trash"
            text
            rounded
            severity="danger"
            @click="$emit('delete', dinner)"
            v-tooltip.top="'Delete'"
          />
        </div>
      </div>
    </template>
    <template #content>
      <div class="space-y-3">
        <p
          v-if="dinner.description"
          class="text-surface-600 dark:text-surface-400"
        >
          {{ dinner.description }}
        </p>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="flex items-center gap-2">
            <i class="pi pi-calendar text-surface-500"></i>
            <span>{{ formatDate(dinner.date) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="pi pi-map-marker text-surface-500"></i>
            <span>{{ dinner.city }}</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="pi pi-users text-surface-500"></i>
            <span>Max {{ dinner.maxParticipants }} participants</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="pi pi-clock text-surface-500"></i>
            <span>Deadline: {{ formatDate(dinner.registrationDeadline) }}</span>
          </div>
        </div>

        <div v-if="participantCount !== undefined" class="pt-2">
          <div class="flex justify-between text-sm mb-2">
            <span>Registrations</span>
            <span class="font-medium"
              >{{ participantCount }} / {{ dinner.maxParticipants }}</span
            >
          </div>
          <ProgressBar
            :value="(participantCount / dinner.maxParticipants) * 100"
            :showValue="false"
          />
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2 justify-end">
        <slot name="actions"></slot>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RunningDinner } from '../types/models';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import ProgressBar from '@churchtools-extensions/prime-volt/ProgressBar.vue';

interface Props {
  dinner: RunningDinner;
  participantCount?: number;
  showActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showActions: false,
});

defineEmits<{
  edit: [dinner: RunningDinner];
  delete: [dinner: RunningDinner];
}>();

const statusLabel = computed(() => {
  const labels: Record<typeof props.dinner.status, string> = {
    draft: 'Draft',
    published: 'Open for Registration',
    'registration-closed': 'Registration Closed',
    'groups-created': 'Groups Created',
    'routes-assigned': 'Routes Assigned',
    completed: 'Completed',
  };
  return labels[props.dinner.status];
});

const statusSeverity = computed(() => {
  const severities: Record<
    typeof props.dinner.status,
    'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast'
  > = {
    draft: 'secondary',
    published: 'success',
    'registration-closed': 'warn',
    'groups-created': 'info',
    'routes-assigned': 'info',
    completed: 'contrast',
  };
  return severities[props.dinner.status];
});

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>
