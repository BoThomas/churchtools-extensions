<template>
  <div class="space-y-6 max-w-5xl">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <template #title>Azure API Configuration</template>
        <template #content>
          <div class="space-y-4">
            <div class="flex flex-col gap-2">
              <label for="api-key" class="font-medium text-sm"
                >Azure Speech API Key</label
              >
              <InputText
                id="api-key"
                v-model="localApiSettings.azureApiKey"
                type="password"
                placeholder="Enter your Azure Speech API key"
                class="w-full"
              />
              <p class="text-xs text-surface-500 dark:text-surface-400">
                Your Azure Speech Service API subscription key
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <label for="api-region" class="font-medium text-sm"
                >Azure Region</label
              >
              <InputText
                id="api-region"
                v-model="localApiSettings.azureRegion"
                placeholder="e.g., westeurope, eastus"
                class="w-full"
              />
              <p class="text-xs text-surface-500 dark:text-surface-400">
                The Azure region where your Speech service is deployed
              </p>
            </div>

            <div class="flex gap-3 pt-4">
              <Button
                label="Save Settings"
                icon="pi pi-save"
                @click="saveSettings"
                :loading="store.apiSettingsSaving"
                :disabled="!isValid"
              />
              <Button
                label="Reload Settings"
                icon="pi pi-replay"
                severity="secondary"
                outlined
                @click="reloadSettings"
                :loading="store.apiSettingsLoading"
              />
            </div>

            <Message v-if="saveSuccess" severity="success" :closable="false">
              Settings saved successfully!
            </Message>

            <Message v-if="store.error" severity="error" :closable="false">
              {{ store.error }}
            </Message>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>How to get Azure API credentials</template>
        <template #content>
          <ol class="list-decimal list-inside space-y-1 text-sm">
            <li>
              Go to
              <a
                href="https://portal.azure.com"
                target="_blank"
                class="text-primary"
                >Azure Portal</a
              >
            </li>
            <li>Create or navigate to your "Speech services" resource</li>
            <li>Scroll to "Keys and Endpoint" under "Overview"</li>
            <li>Copy one of the keys and the region</li>
            <li>Paste them into the fields above</li>
          </ol>
        </template>
      </Card>
    </div>

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
import { ref, computed, watch } from 'vue';
import { useTranslatorStore } from '../stores/translator';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import extensionInfo from 'virtual:extension-info';

const store = useTranslatorStore();

const localApiSettings = ref({ ...store.apiSettings });
const saveSuccess = ref(false);

// Watch store API settings changes
watch(
  () => store.apiSettings,
  (newApiSettings) => {
    localApiSettings.value = { ...newApiSettings };
  },
  { deep: true },
);

const isValid = computed(() => {
  return (
    !!localApiSettings.value.azureApiKey && !!localApiSettings.value.azureRegion
  );
});

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString();
}

async function saveSettings() {
  try {
    await store.saveApiSettings(localApiSettings.value);
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (e) {
    console.error('Failed to save API settings', e);
  }
}

async function reloadSettings() {
  try {
    await store.loadApiSettings();
    localApiSettings.value = { ...store.apiSettings };
  } catch (e) {
    console.error('Failed to reload API settings', e);
  }
}
</script>
