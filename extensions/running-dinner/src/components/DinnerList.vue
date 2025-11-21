<template>
  <div class="space-y-3">
    <Card v-for="d in dinners" :key="d.id">
      <template #title>
        <div class="flex items-center justify-between gap-4">
          <span>{{ d.value.name }}</span>
          <div class="flex gap-2 items-center">
            <slot name="actions" :record="d" />
          </div>
        </div>
      </template>
      <template #content>
        <p
          class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed"
        >
          {{ d.value.description || 'Keine Beschreibung.' }}
        </p>
        <ul class="mt-2 text-xs flex flex-wrap gap-x-6 gap-y-1">
          <li>
            <span class="font-medium">Datum:</span>
            {{ formatDate(d.value.date) || '—' }}
          </li>
          <li>
            <span class="font-medium">Stadt:</span> {{ d.value.city || '—' }}
          </li>
          <li>
            <span class="font-medium">Max:</span>
            {{ d.value.maxParticipants || '—' }}
          </li>
          <li>
            <span class="font-medium">Gruppengröße:</span>
            {{ d.value.preferredGroupSize || '—' }}
          </li>
          <li>
            <span class="font-medium">Flags:</span>
            <span class="inline-flex gap-1">
              <Badge v-if="d.value.allowPreferredPartners" severity="info"
                >Partner</Badge
              >
              <Badge v-if="d.value.publicSingleSignins" severity="info"
                >Singles</Badge
              >
              <Badge v-if="d.value.allowPreferredMeal" severity="info"
                >Essen</Badge
              >
            </span>
          </li>
        </ul>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from '@/volt/Card.vue';
import Badge from '@/volt/Badge.vue';
import type { CategoryValue } from '@/api/persistance';
import type { RunningDinnerRecord } from '@/stores/runningDinner';

defineProps<{ dinners: CategoryValue<RunningDinnerRecord>[] }>();

function formatDate(v?: string) {
  if (!v) return '';
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return v;
  }
}
</script>
