<template>
  <Fieldset>
    <template #legend>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <i class="pi pi-sitemap"></i>
          <span class="font-semibold">Controls</span>
        </div>
        <Badge v-if="stateText" :value="stateText" :severity="statusSeverity" />
      </div>
    </template>
    <div class="flex flex-col gap-4">
      <!-- Info about popup blocking in multi-window mode -->
      <Message
        v-if="presentationMode === 'multi-window'"
        severity="info"
        :closable="true"
        icon="pi pi-info-circle"
      >
        Browser Popup Blocker: Multi-window mode opens multiple browser windows.
        Most browsers block this by default. If windows don't open, look for a
        popup blocker icon in your browser's address bar and allow popups for
        this site.
      </Message>

      <!-- Warning for too many languages in split mode -->
      <Message
        v-if="hasTooManyLanguagesForSplit"
        severity="warn"
        :closable="false"
        icon="pi pi-exclamation-triangle"
      >
        <div v-if="showInputLanguage">
          Split-screen presentation mode supports up to 6 languages total (5
          output + 1 input). You have
          {{ presentationLanguagesCount }} selected ({{ outputLanguagesCount }}
          output + 1 input). Please reduce the number of output languages or
          disable "Show Input Language".
        </div>
        <div v-else>
          Split-screen presentation mode supports up to 6 output languages. You
          have {{ outputLanguagesCount }} selected. Please reduce the number of
          output languages or switch to Multi-window mode.
        </div>
      </Message>

      <!-- Main Flow: Test & Presentation -->
      <div class="controls-grid grid grid-cols-1 gap-3 items-stretch">
        <!-- Test Modes -->
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase text-surface-500">
            Testing
          </span>
          <div class="test-button-wrapper flex flex-col gap-2">
            <SecondaryButton
              label="Test Translation"
              icon="pi pi-compass"
              @click="$emit('start-test')"
              :disabled="
                isPresentationRunning ||
                isTestRunning ||
                isTestPresentationRunning ||
                hasInvalidLanguages
              "
              class="test-button w-full"
              data-testid="button-test-translation"
            />
            <SecondaryButton
              label="Test Presentation"
              icon="pi pi-external-link"
              @click="$emit('start-test-presentation')"
              :disabled="
                isPresentationRunning ||
                isTestRunning ||
                isTestPresentationRunning ||
                presentationWindowsOpenedButNotStarted ||
                hasTooManyLanguagesForSplit ||
                hasInvalidLanguages
              "
              severity="secondary"
              data-testid="button-test-presentation"
            />
          </div>
        </div>

        <!-- Presentation flow as input group -->
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase text-surface-500">
            Live presentation
          </span>
          <div class="presentation-buttons-wrapper flex flex-col gap-2">
            <Button
              label="Presentation"
              icon="pi pi-external-link"
              @click="$emit('start-presentation')"
              :disabled="
                isPresentationRunning ||
                isTestRunning ||
                isTestPresentationRunning ||
                presentationWindowsOpenedButNotStarted ||
                hasTooManyLanguagesForSplit ||
                hasInvalidLanguages
              "
              severity="secondary"
              data-testid="button-presentation"
            />
            <DangerButton
              v-if="
                presentationWindowsOpenedButNotStarted &&
                isPresentationRunning &&
                !isRecordingStarted
              "
              label="Start Recording"
              icon="pi pi-microphone"
              @click="$emit('start-recording')"
              data-testid="button-start-recording"
            />
            <DangerButton
              v-if="
                presentationWindowsOpenedButNotStarted &&
                isTestPresentationRunning &&
                !isRecordingStarted
              "
              label="Start Test"
              icon="pi pi-compass"
              @click="$emit('start-test-generation')"
              data-testid="button-start-test-generation"
            />
            <Button
              v-if="isPaused"
              label="Resume"
              icon="pi pi-play"
              @click="$emit('pause-or-resume')"
              :disabled="
                !(
                  (isPresentationRunning && isRecordingStarted) ||
                  isTestRunning ||
                  (isTestPresentationRunning &&
                    !presentationWindowsOpenedButNotStarted)
                )
              "
              data-testid="button-resume"
            />
            <Button
              v-else
              label="Pause"
              icon="pi pi-pause"
              @click="$emit('pause-or-resume')"
              :disabled="
                !(
                  (isPresentationRunning && isRecordingStarted) ||
                  isTestRunning ||
                  (isTestPresentationRunning &&
                    !presentationWindowsOpenedButNotStarted)
                )
              "
              severity="warning"
              data-testid="button-pause"
            />
            <Button
              label="Stop"
              icon="pi pi-stop"
              @click="$emit('stop')"
              :disabled="
                !(
                  isPresentationRunning ||
                  isTestRunning ||
                  isTestPresentationRunning ||
                  presentationWindowsOpenedButNotStarted
                )
              "
              severity="danger"
              outlined
              data-testid="button-stop"
            />
          </div>
        </div>
      </div>
      <div class="text-xs text-surface-500 flex items-center justify-end">
        <span>
          Open the presentation first, enter fullscreen/place window(s), then
          start & control from here.
        </span>
      </div>

      <!-- Save/Load Settings -->
      <div
        class="flex flex-col gap-4 pt-4 border-t border-surface-300 dark:border-surface-700"
      >
        <div class="flex flex-col md:flex-row gap-3">
          <!-- Variant Selector -->
          <div class="flex-1 flex flex-col gap-2">
            <label for="variant-select" class="font-medium text-sm"
              >Setting Variant</label
            >
            <div class="flex gap-2">
              <Select
                id="variant-select"
                :model-value="selectedVariantId"
                :options="settingVariants"
                optionLabel="value.name"
                optionValue="id"
                placeholder="Select a variant"
                @change="$emit('variant-change', $event)"
                :disabled="inputsDisabled"
                class="flex-1"
                data-testid="select-variant"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                outlined
                @click="$emit('confirm-delete-variant')"
                :disabled="
                  inputsDisabled ||
                  settingVariants.length <= 1 ||
                  isDefaultVariantSelected
                "
                v-tooltip.top="'Delete variant'"
                data-testid="button-delete-variant"
              />
            </div>
          </div>

          <!-- Save Buttons -->
          <div class="flex gap-2 items-end">
            <ContrastButton
              label="Save"
              icon="pi pi-save"
              @click="$emit('save-current-variant')"
              :disabled="
                inputsDisabled ||
                settingsSaving ||
                !hasUnsavedChanges ||
                isDefaultVariantSelected ||
                hasInvalidLanguages
              "
              :loading="settingsSaving"
              data-testid="button-save-variant"
            />
            <ContrastButton
              label="Save As..."
              icon="pi pi-plus"
              variant="outlined"
              @click="$emit('prompt-save-as-new-variant')"
              :disabled="inputsDisabled || hasInvalidLanguages"
              data-testid="button-save-as-variant"
            />
          </div>
        </div>
        <div
          v-if="hasUnsavedChanges"
          class="text-xs text-orange-400 dark:text-orange-200 flex items-center gap-1"
        >
          <i class="pi pi-exclamation-triangle"></i>
          <span v-if="isDefaultVariantSelected">
            You have unsaved changes. Use "Save As..." to create a new variant.
          </span>
          <span v-else> You have unsaved changes </span>
        </div>
      </div>
    </div>
  </Fieldset>
</template>

<script setup lang="ts">
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import ContrastButton from '@churchtools-extensions/prime-volt/ContrastButton.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';

interface SettingVariant {
  id: number;
  value: {
    name: string;
  };
}

interface Props {
  // State props
  isTestRunning: boolean;
  isPresentationRunning: boolean;
  isTestPresentationRunning: boolean;
  isPaused: boolean;
  isRecordingStarted: boolean;
  presentationWindowsOpenedButNotStarted: boolean;
  stateText: string;
  statusSeverity: string;

  // Presentation mode props
  presentationMode: 'split' | 'multi-window';
  showInputLanguage: boolean;
  presentationLanguagesCount: number;
  outputLanguagesCount: number;
  hasTooManyLanguagesForSplit: boolean;

  // Variant management props
  selectedVariantId: number | null;
  settingVariants: SettingVariant[];
  hasUnsavedChanges: boolean;
  settingsSaving: boolean;
  isDefaultVariantSelected: boolean;
  hasInvalidLanguages: boolean;
  inputsDisabled: boolean;
}

defineProps<Props>();

defineEmits<{
  'start-test': [];
  'start-test-presentation': [];
  'start-presentation': [];
  'start-recording': [];
  'start-test-generation': [];
  'pause-or-resume': [];
  stop: [];
  'variant-change': [event: any];
  'confirm-delete-variant': [];
  'save-current-variant': [];
  'prompt-save-as-new-variant': [];
}>();
</script>

<style scoped>
/* Use explicit media queries to avoid conflicts with host page Tailwind */

/* Medium layout - horizontal buttons within each section */
@media (min-width: 768px) {
  .test-button-wrapper {
    flex-direction: row;
  }

  .test-button {
    width: auto;
  }

  .presentation-buttons-wrapper {
    flex-direction: row;
    align-items: stretch;
  }

  .presentation-buttons-wrapper > button {
    flex: 1;
  }
}

/* Wide layout - two-column grid with sections side-by-side */
@media (min-width: 1024px) {
  .controls-grid {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  }
}
</style>
