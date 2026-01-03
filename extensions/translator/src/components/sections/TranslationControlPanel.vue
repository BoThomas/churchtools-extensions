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
      <div
        class="controls-flow flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-start"
      >
        <!-- Test Modes -->
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase text-surface-500">
            Testing
          </span>
          <!-- Individual buttons for smaller screens -->
          <div class="flex flex-col gap-2 sm:hidden">
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
                hasInvalidLanguages ||
                (isWebPubSubEnabled && !isPresentationEnabled)
              "
              severity="secondary"
              data-testid="button-test-presentation"
            />
            <SecondaryButton
              v-if="isWebPubSubEnabled"
              label="Test Session"
              icon="pi pi-users"
              @click="$emit('start-test-session')"
              :disabled="
                isPresentationRunning ||
                isTestRunning ||
                isTestPresentationRunning ||
                hasInvalidLanguages ||
                !isSessionEnabled
              "
              severity="secondary"
              data-testid="button-test-session"
            />
          </div>
          <!-- ButtonGroup for medium and larger screens -->
          <ButtonGroup class="hidden sm:flex">
            <SecondaryButton
              label="Translation"
              icon="pi pi-compass"
              @click="$emit('start-test')"
              :disabled="
                isPresentationRunning ||
                isTestRunning ||
                isTestPresentationRunning ||
                hasInvalidLanguages
              "
              data-testid="button-test-translation"
            />
            <SecondaryButton
              label="Presentation"
              icon="pi pi-external-link"
              @click="$emit('start-test-presentation')"
              :disabled="
                isPresentationRunning ||
                isTestRunning ||
                isTestPresentationRunning ||
                presentationWindowsOpenedButNotStarted ||
                hasTooManyLanguagesForSplit ||
                hasInvalidLanguages ||
                (isWebPubSubEnabled && !isPresentationEnabled)
              "
              severity="secondary"
              data-testid="button-test-presentation"
            />
            <SecondaryButton
              v-if="isWebPubSubEnabled"
              label="Session"
              icon="pi pi-users"
              @click="$emit('start-test-session')"
              :disabled="
                isPresentationRunning ||
                isTestRunning ||
                isTestPresentationRunning ||
                hasInvalidLanguages ||
                !isSessionEnabled
              "
              severity="secondary"
              data-testid="button-test-session"
            />
          </ButtonGroup>
        </div>

        <!-- Live Translation flow as input group -->
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase text-surface-500">
            Live Translation
          </span>
          <!-- Individual buttons for smaller screens -->
          <div class="flex flex-col gap-2 sm:hidden">
            <Button
              v-if="
                !(
                  presentationWindowsOpenedButNotStarted &&
                  !isRecordingStarted &&
                  (isPresentationRunning || isTestPresentationRunning)
                )
              "
              label="Prepare Translation"
              icon="pi pi-language"
              @click="$emit('start-presentation')"
              :disabled="
                isPresentationRunning ||
                isTestRunning ||
                isTestPresentationRunning ||
                presentationWindowsOpenedButNotStarted ||
                hasTooManyLanguagesForSplit ||
                hasInvalidLanguages ||
                (isWebPubSubEnabled &&
                  !isPresentationEnabled &&
                  !isSessionEnabled)
              "
              data-testid="button-presentation"
            />
            <DangerButton
              v-if="
                presentationWindowsOpenedButNotStarted &&
                isPresentationRunning &&
                !isRecordingStarted
              "
              label="Start Translation"
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
              outlined
              data-testid="button-stop"
            />
          </div>
          <!-- ButtonGroup for medium and larger screens -->
          <ButtonGroup class="hidden sm:flex">
            <Button
              v-if="
                !(
                  presentationWindowsOpenedButNotStarted &&
                  !isRecordingStarted &&
                  (isPresentationRunning || isTestPresentationRunning)
                )
              "
              label="Prepare Translation"
              icon="pi pi-language"
              @click="$emit('start-presentation')"
              :disabled="
                isPresentationRunning ||
                isTestRunning ||
                isTestPresentationRunning ||
                presentationWindowsOpenedButNotStarted ||
                hasTooManyLanguagesForSplit ||
                hasInvalidLanguages ||
                (isWebPubSubEnabled &&
                  !isPresentationEnabled &&
                  !isSessionEnabled)
              "
              data-testid="button-presentation"
            />
            <DangerButton
              v-if="
                presentationWindowsOpenedButNotStarted &&
                isPresentationRunning &&
                !isRecordingStarted
              "
              label="Start Translation"
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
              outlined
              data-testid="button-stop"
            />
          </ButtonGroup>
        </div>
      </div>
      <div
        v-if="isPresentationEnabled"
        class="text-xs text-surface-500 flex items-center justify-end"
      >
        <span>
          Prepare translation first, enter fullscreen/place window(s), then
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
import ButtonGroup from '@churchtools-extensions/prime-volt/ButtonGroup.vue';

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

  // WebPubSub props
  isWebPubSubEnabled?: boolean;
  isPresentationEnabled?: boolean;
  isSessionEnabled?: boolean;

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
  'start-test-session': [];
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
