<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
    <Card>
      <template #title>About Running Dinner Groups</template>
      <template #content>
        <div class="space-y-4">
          <p>
            Organize Running Dinner events using ChurchTools' native group
            management system. This extension helps organizers automate group
            creation, meal routing, and participant communication.
          </p>
          <p>
            Participants register through ChurchTools groups, while organizers
            use this extension to create dinner groups, assign routes, and send
            email notifications.
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
        </div>
      </template>
    </Card>

    <Card>
      <template #title>How It Works</template>
      <template #content>
        <div class="space-y-4">
          <div>
            <h4 class="font-semibold mb-2 flex items-center gap-2">
              <i class="pi pi-users"></i>
              1. Participant Registration
            </h4>
            <p class="text-sm text-surface-600 dark:text-surface-400">
              Participants join ChurchTools groups and fill out custom fields
              (meal preference, dietary restrictions, partner preferences).
            </p>
          </div>
          <div>
            <h4 class="font-semibold mb-2 flex items-center gap-2">
              <i class="pi pi-sitemap"></i>
              2. Create Dinner Groups
            </h4>
            <p class="text-sm text-surface-600 dark:text-surface-400">
              The algorithm groups participants based on preferences and assigns
              meals (starter, main course, dessert).
            </p>
          </div>
          <div>
            <h4 class="font-semibold mb-2 flex items-center gap-2">
              <i class="pi pi-map-marker"></i>
              3. Assign Routes
            </h4>
            <p class="text-sm text-surface-600 dark:text-surface-400">
              Routes are calculated ensuring each group visits different hosts
              for each meal course.
            </p>
          </div>
          <div>
            <h4 class="font-semibold mb-2 flex items-center gap-2">
              <i class="pi pi-envelope"></i>
              4. Send Notifications
            </h4>
            <p class="text-sm text-surface-600 dark:text-surface-400">
              Generate and send personalized emails with complete route
              information, dietary restrictions, and contact details.
            </p>
          </div>
        </div>
      </template>
    </Card>

    <Card>
      <template #title>ChurchTools Integration</template>
      <template #content>
        <div class="space-y-4">
          <p class="text-sm">
            This extension uses ChurchTools' group management system:
          </p>
          <div class="space-y-3">
            <div
              class="flex items-start gap-3 p-3 bg-surface-100 dark:bg-surface-800 rounded"
            >
              <i class="pi pi-folder text-primary pt-1"></i>
              <div>
                <div class="font-semibold">Parent Group</div>
                <div class="text-sm text-surface-600 dark:text-surface-400">
                  "Running Dinner" service group contains all events
                </div>
              </div>
            </div>
            <div
              class="flex items-start gap-3 p-3 bg-surface-100 dark:bg-surface-800 rounded"
            >
              <i class="pi pi-calendar text-primary pt-1"></i>
              <div>
                <div class="font-semibold">Child Groups</div>
                <div class="text-sm text-surface-600 dark:text-surface-400">
                  Each event is a child group with custom fields
                </div>
              </div>
            </div>
            <div
              class="flex items-start gap-3 p-3 bg-surface-100 dark:bg-surface-800 rounded"
            >
              <i class="pi pi-database text-primary pt-1"></i>
              <div>
                <div class="font-semibold">Custom Fields</div>
                <div class="text-sm text-surface-600 dark:text-surface-400">
                  Meal preferences, dietary restrictions, allergens, partners
                </div>
              </div>
            </div>
          </div>
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
