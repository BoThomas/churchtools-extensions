<template>
  <div class="space-y-6 max-w-5xl">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <span>Azure Speech Service Configuration</span>
            <Badge value="Mandatory" severity="warn" />
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <div class="flex flex-col gap-2">
              <label for="api-key" class="font-medium text-sm"
                >Azure Speech API Key</label
              >
              <Password
                id="api-key"
                v-model="localApiSettings.azureApiKey"
                placeholder="Enter your Azure Speech API key"
                inputClass="w-full"
                class="w-full"
                :feedback="false"
                toggleMask
                data-testid="input-api-key"
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
                data-testid="input-api-region"
              />
              <p class="text-xs text-surface-500 dark:text-surface-400">
                The Azure region where your Speech service is deployed
              </p>
            </div>

            <div>
              <div class="min-h-5 mb-1">
                <div
                  v-if="hasUnsavedApiChanges"
                  class="text-xs text-orange-400 dark:text-orange-200 flex items-center gap-1"
                >
                  <i class="pi pi-exclamation-triangle"></i>
                  <span>You have unsaved changes</span>
                </div>
              </div>
              <div class="flex gap-3">
                <Button
                  label="Save"
                  icon="pi pi-save"
                  @click="saveSettings"
                  :loading="store.apiSettingsSaving"
                  :disabled="!isValid || !hasUnsavedApiChanges"
                  data-testid="button-save-settings"
                />
                <Button
                  label="Reload"
                  icon="pi pi-replay"
                  severity="secondary"
                  outlined
                  @click="reloadSettings"
                  :loading="store.apiSettingsLoading"
                  data-testid="button-reload-settings"
                />
              </div>
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
        <template #title>How to get Speech Service credentials</template>
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
          </ol>
        </template>
      </Card>
    </div>

    <!-- WebPubSub Configuration -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <span>Azure WebPubSub Streaming Configuration</span>
          <Badge value="Optional" severity="info" />
        </div>
      </template>
      <template #content>
        <div class="space-y-4">
          <div
            class="flex items-center gap-3 pb-2 border-b border-surface-200 dark:border-surface-700"
          >
            <Checkbox
              v-model="localReaderConfig.enabled"
              inputId="webpubsub-enabled"
              :binary="true"
              data-testid="checkbox-webpubsub-enabled"
            />
            <label
              for="webpubsub-enabled"
              class="font-medium cursor-pointer select-none"
            >
              Enable WebPubSub Streaming
            </label>
          </div>

          <Message
            v-if="!store.readerConfig.enabled && !localReaderConfig.enabled"
            severity="info"
            :closable="false"
          >
            WebPubSub streaming is currently disabled. Enable it to stream live
            translations to multiple readers.
          </Message>

          <div
            v-if="store.readerConfig.enabled || localReaderConfig.enabled"
            class="space-y-4"
          >
            <div class="flex flex-col gap-2">
              <label for="operator-secret" class="font-medium text-sm">
                Operator Secret
              </label>
              <Password
                id="operator-secret"
                v-model="localOperatorSecret.secret"
                placeholder="Enter operator secret for WebPubSub"
                inputClass="w-full"
                class="w-full"
                :feedback="false"
                toggleMask
                data-testid="input-operator-secret"
              />
              <p class="text-xs text-surface-500 dark:text-surface-400">
                Secret used by operators to create and manage streaming
                sessions. Stored in a restricted access category.
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <label for="reader-secret" class="font-medium text-sm">
                Reader Secret
              </label>
              <Password
                id="reader-secret"
                v-model="localReaderConfig.readerSecret"
                placeholder="Enter reader secret for WebPubSub"
                inputClass="w-full"
                class="w-full"
                :feedback="false"
                toggleMask
                data-testid="input-reader-secret"
              />
              <p class="text-xs text-surface-500 dark:text-surface-400">
                Secret used by readers to join streaming sessions. Publicly
                readable.
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <label for="auth-function-url" class="font-medium text-sm">
                Auth Function URL
              </label>
              <InputText
                id="auth-function-url"
                v-model="localReaderConfig.authFunctionUrl"
                placeholder="https://your-function.azurewebsites.net/api/negotiate"
                class="w-full"
                data-testid="input-auth-function-url"
              />
              <p class="text-xs text-surface-500 dark:text-surface-400">
                Azure Function URL for obtaining WebSocket connection strings
                with tokens. Publicly readable.
              </p>
            </div>
          </div>

          <div>
            <div class="min-h-5 mb-1">
              <div
                v-if="hasUnsavedWebPubSubChanges"
                class="text-xs text-orange-400 dark:text-orange-200 flex items-center gap-1"
              >
                <i class="pi pi-exclamation-triangle"></i>
                <span>You have unsaved changes</span>
              </div>
            </div>
            <div class="flex gap-3">
              <Button
                label="Save"
                icon="pi pi-save"
                @click="saveWebPubSubSettings"
                :loading="webPubSubSaving || webPubSubValidating"
                :disabled="!isWebPubSubValid || !hasUnsavedWebPubSubChanges"
                data-testid="button-save-webpubsub"
              />
              <Button
                label="Reload"
                icon="pi pi-replay"
                severity="secondary"
                outlined
                @click="reloadWebPubSubSettings"
                :loading="webPubSubLoading"
                data-testid="button-reload-webpubsub"
              />
              <DangerButton
                v-if="store.readerConfig.enabled || localReaderConfig.enabled"
                label="Clear Settings"
                icon="pi pi-trash"
                outlined
                @click="clearWebPubSubSettings"
                data-testid="button-clear-webpubsub"
              />
            </div>
          </div>

          <Message v-if="webPubSubValidating" severity="info" :closable="false">
            <i class="pi pi-spin pi-spinner mr-2"></i>
            Validating configuration with Azure function...
          </Message>

          <Message
            v-if="webPubSubValidationError"
            severity="error"
            :closable="true"
            @close="webPubSubValidationError = null"
          >
            {{ webPubSubValidationError }}
          </Message>

          <Message
            v-if="webPubSubSaveSuccess"
            severity="success"
            :closable="false"
          >
            WebPubSub settings saved successfully!
          </Message>
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
import { ref, computed, watch, onMounted } from 'vue';
import { useTranslatorStore } from '../stores/translator';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import Password from '@churchtools-extensions/prime-volt/Password.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Checkbox from '@churchtools-extensions/prime-volt/Checkbox.vue';
import { useConfirm } from 'primevue/useconfirm';
import extensionInfo from 'virtual:extension-info';

const store = useTranslatorStore();
const confirm = useConfirm();

const localApiSettings = ref({ ...store.apiSettings });
const saveSuccess = ref(false);

const localOperatorSecret = ref({ ...store.operatorSecret });
const localReaderConfig = ref({ ...store.readerConfig });
const webPubSubSaveSuccess = ref(false);
const webPubSubValidationError = ref<string | null>(null);
const webPubSubValidating = ref(false);
const webPubSubLoading = computed(
  () => store.operatorSecretLoading || store.readerConfigLoading,
);
const webPubSubSaving = computed(
  () => store.operatorSecretSaving || store.readerConfigSaving,
);

// Dirty tracking for API settings
const hasUnsavedApiChanges = computed(() => {
  return (
    localApiSettings.value.azureApiKey !== store.apiSettings.azureApiKey ||
    localApiSettings.value.azureRegion !== store.apiSettings.azureRegion
  );
});

// Dirty tracking for WebPubSub settings
const hasUnsavedWebPubSubChanges = computed(() => {
  return (
    localOperatorSecret.value.secret !== store.operatorSecret.secret ||
    localReaderConfig.value.enabled !== store.readerConfig.enabled ||
    localReaderConfig.value.authFunctionUrl !==
      store.readerConfig.authFunctionUrl ||
    localReaderConfig.value.readerSecret !== store.readerConfig.readerSecret
  );
});

// Watch store API settings changes
watch(
  () => store.apiSettings,
  (newApiSettings) => {
    localApiSettings.value = { ...newApiSettings };
  },
  { deep: true },
);

// Watch store operator secret changes
watch(
  () => store.operatorSecret,
  (newOperatorSecret) => {
    localOperatorSecret.value = { ...newOperatorSecret };
  },
  { deep: true },
);

// Watch store reader config changes
watch(
  () => store.readerConfig,
  (newReaderConfig) => {
    localReaderConfig.value = { ...newReaderConfig };
  },
  { deep: true },
);

const isValid = computed(() => {
  return (
    !!localApiSettings.value.azureApiKey && !!localApiSettings.value.azureRegion
  );
});

const isWebPubSubValid = computed(() => {
  // If not enabled, no validation needed
  if (!localReaderConfig.value.enabled) {
    return true;
  }
  // If enabled, all fields must be filled
  return (
    !!localOperatorSecret.value.secret.trim() &&
    !!localReaderConfig.value.authFunctionUrl.trim() &&
    !!localReaderConfig.value.readerSecret.trim()
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

async function saveWebPubSubSettings() {
  webPubSubValidationError.value = null;

  try {
    // If trying to enable, validate first
    if (localReaderConfig.value.enabled) {
      // Check all fields are filled
      if (
        !localOperatorSecret.value.secret.trim() ||
        !localReaderConfig.value.authFunctionUrl.trim() ||
        !localReaderConfig.value.readerSecret.trim()
      ) {
        webPubSubValidationError.value =
          'All fields must be filled to enable WebPubSub';
        return;
      }

      // Validate with Azure function
      webPubSubValidating.value = true;
      const validationResult = await store.validateWebPubSubConfig({
        authFunctionUrl: localReaderConfig.value.authFunctionUrl,
        operatorSecret: localOperatorSecret.value.secret,
        readerSecret: localReaderConfig.value.readerSecret,
      });
      webPubSubValidating.value = false;

      if (!validationResult.valid) {
        webPubSubValidationError.value =
          validationResult.error || 'Validation failed';
        // Don't save if validation failed
        return;
      }
    }

    // Save both configs
    await Promise.all([
      store.saveOperatorSecret(localOperatorSecret.value),
      store.saveReaderConfig(localReaderConfig.value),
    ]);

    webPubSubSaveSuccess.value = true;
    setTimeout(() => {
      webPubSubSaveSuccess.value = false;
    }, 3000);
  } catch (e) {
    console.error('Failed to save WebPubSub settings', e);
    webPubSubValidationError.value = 'Failed to save settings';
  }
}

async function reloadWebPubSubSettings() {
  try {
    await Promise.all([store.loadOperatorSecret(), store.loadReaderConfig()]);
    localOperatorSecret.value = { ...store.operatorSecret };
    localReaderConfig.value = { ...store.readerConfig };
  } catch (e) {
    console.error('Failed to reload WebPubSub settings', e);
  }
}

async function clearWebPubSubSettings() {
  confirm.require({
    message:
      'This will clear all WebPubSub settings and disable the feature. Continue?',
    header: 'Clear WebPubSub Settings',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    acceptLabel: 'Clear Settings',
    accept: async () => {
      try {
        // Clear local state
        localOperatorSecret.value.secret = '';
        localReaderConfig.value = {
          enabled: false,
          authFunctionUrl: '',
          readerSecret: '',
        };

        // Save cleared state
        await Promise.all([
          store.saveOperatorSecret(localOperatorSecret.value),
          store.saveReaderConfig(localReaderConfig.value),
        ]);

        webPubSubSaveSuccess.value = true;
        webPubSubValidationError.value = null;
        setTimeout(() => {
          webPubSubSaveSuccess.value = false;
        }, 3000);
      } catch (e) {
        console.error('Failed to clear WebPubSub settings', e);
        webPubSubValidationError.value = 'Failed to clear settings';
      }
    },
  });
}

// Load WebPubSub settings on mount
onMounted(async () => {
  await Promise.all([store.loadOperatorSecret(), store.loadReaderConfig()]);
  localOperatorSecret.value = { ...store.operatorSecret };
  localReaderConfig.value = { ...store.readerConfig };
});
</script>
