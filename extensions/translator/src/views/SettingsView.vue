<template>
  <div class="space-y-6 max-w-2xl">
    <h2 class="text-2xl font-semibold">Azure API Configuration</h2>

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
        <p class="text-xs text-surface-600 dark:text-surface-400">
          Your Azure Cognitive Services Speech API subscription key
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <label for="api-region" class="font-medium text-sm">Azure Region</label>
        <InputText
          id="api-region"
          v-model="localApiSettings.azureRegion"
          placeholder="e.g., westeurope, eastus"
          class="w-full"
        />
        <p class="text-xs text-surface-600 dark:text-surface-400">
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

    <div class="mt-8 p-4 bg-surface-100 dark:bg-surface-800 rounded">
      <h3 class="text-lg font-semibold mb-2">
        How to get Azure API credentials
      </h3>
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
        <li>Create or navigate to your Cognitive Services resource</li>
        <li>Go to "Keys and Endpoint"</li>
        <li>Copy one of the keys and the region</li>
        <li>Paste them into the fields above</li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTranslatorStore } from '../stores/translator';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';

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
