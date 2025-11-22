<template>
  <div class="space-y-6 max-w-5xl">
    <Card>
      <template #title>About Running Dinner</template>
      <template #content>
        <div class="space-y-4">
          <p>
            Organize and manage Running Dinner events directly in ChurchTools.
            Create multi-course dining experiences where participants travel
            between different hosts for each course.
          </p>
          <p>
            Running Dinner helps you plan events where groups of participants
            visit each other's homes for different courses of a meal, creating a
            fun and social dining experience.
          </p>
        </div>
      </template>
    </Card>

    <Card>
      <template #title>Extension Information</template>
      <template #content>
        <div
          class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-center max-w-2xl"
        >
          <span class="text-surface-500 dark:text-surface-400 text-sm"
            >Name</span
          >
          <div>
            <Badge :value="extensionInfo.name" severity="contrast" />
          </div>

          <span class="text-surface-500 dark:text-surface-400 text-sm"
            >Version</span
          >
          <div class="flex items-center gap-2">
            <Badge :value="extensionInfo.version" severity="contrast" />
          </div>

          <span class="text-surface-500 dark:text-surface-400 text-sm"
            >Git Commit</span
          >
          <div class="flex items-center gap-2">
            <Badge :value="'# ' + extensionInfo.gitHash" severity="secondary" />
            <Badge
              :value="'⎇ ' + extensionInfo.gitBranch"
              severity="secondary"
            />
          </div>

          <span class="text-surface-500 dark:text-surface-400 text-sm"
            >Built</span
          >
          <div>
            <Badge
              :value="formatDate(extensionInfo.buildDate)"
              severity="secondary"
            />
          </div>

          <template
            v-if="extensionInfo.authorName || extensionInfo.authorEmail"
          >
            <span class="text-surface-500 dark:text-surface-400 text-sm"
              >Author</span
            >
            <a
              v-if="extensionInfo.authorEmail"
              :href="'mailto:' + extensionInfo.authorEmail"
              class="flex items-center gap-2 text-sm group"
              target="_blank"
            >
              <i class="pi pi-envelope text-primary"></i>
              <span class="group-hover:underline">{{
                extensionInfo.authorName
              }}</span>
            </a>
            <span v-else class="text-sm">{{ extensionInfo.authorName }}</span>
          </template>

          <template v-if="extensionInfo.repositoryUrl">
            <span class="text-surface-500 dark:text-surface-400 text-sm"
              >Repository</span
            >
            <a
              :href="extensionInfo.repositoryUrl"
              target="_blank"
              class="flex items-center gap-2 text-xs font-mono group"
            >
              <i class="pi pi-github text-sm text-primary"></i>
              <span
                class="text-surface-500 dark:text-surface-400 group-hover:underline"
              >
                {{ extensionInfo.repositoryUrl }}
              </span>
            </a>
          </template>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import extensionInfo from 'virtual:extension-info';

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString();
}
</script>
