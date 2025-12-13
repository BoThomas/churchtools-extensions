<template>
  <div class="space-y-6">
    <Message
      v-if="!hasApiCredentials"
      severity="warn"
      :closable="false"
      icon="pi pi-exclamation-triangle"
    >
      Please configure your Azure API credentials in the Settings tab first.
    </Message>

    <Message
      v-if="error"
      severity="error"
      :closable="true"
      @close="error = null"
    >
      {{ error }}
    </Message>

    <Message
      v-if="hasInvalidLanguages"
      severity="warn"
      :closable="false"
      icon="pi pi-exclamation-triangle"
    >
      <div>
        <p>
          <strong>Invalid Language Configuration:</strong> Either you have no
          input/output language selected, or some selected languages are no
          longer available.
        </p>
        <p class="text-sm">
          This may occur after updating the extension. Please select valid
          languages from the dropdowns below and save your settings.
        </p>
      </div>
    </Message>

    <div v-if="hasApiCredentials" class="space-y-6">
      <!-- Translation Options -->
      <Fieldset
        legend="Translation Options"
        :collapsed="true"
        :toggleable="true"
      >
        <!-- TODO: Volt doesnt support custom legends in combination with toggleable fieldsets yet -->
        <!-- <template #legend>
          <div class="flex items-center gap-2">
            <i class="pi pi-language"></i>
            <span class="font-semibold">Translation Options</span>
          </div>
        </template> -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Input Language -->
          <div class="flex flex-col gap-2">
            <label for="input-lang" class="font-medium text-sm"
              >Spoken Input Language</label
            >
            <div class="flex items-stretch w-full">
              <Select
                id="input-lang"
                v-model="store.settings.inputLanguage"
                :options="inputLanguages"
                filter
                optionLabel="name"
                optionValue="code"
                :disabled="inputsDisabled"
                placeholder="Select input language"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => inputLangPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="inputLangPopover">
              <div class="max-w-xs">
                <p class="text-sm">The spoken language to be translated.</p>
              </div>
            </Popover>
          </div>

          <!-- Output Languages -->
          <div class="flex flex-col gap-2">
            <label for="output-langs" class="font-medium text-sm"
              >Written Output Languages</label
            >
            <div class="flex items-stretch w-full">
              <Multiselect
                id="output-langs"
                v-model="store.settings.outputLanguages"
                :options="outputLanguages"
                filter
                optionLabel="name"
                optionValue="code"
                :disabled="inputsDisabled"
                placeholder="Select output languages"
                :maxSelectedLabels="2"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => outputLangPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="outputLangPopover">
              <div class="max-w-xs">
                <p class="text-sm">
                  The written languages to which speech is translated. Multiple
                  languages can be selected.
                </p>
              </div>
            </Popover>
          </div>

          <!-- Profanity Filter -->
          <div class="flex flex-col gap-2">
            <label for="profanity" class="font-medium text-sm"
              >Profanity Option</label
            >
            <div class="flex items-stretch w-full">
              <Select
                id="profanity"
                v-model="store.settings.profanityOption"
                :options="profanityOptions"
                :disabled="inputsDisabled"
                placeholder="Select profanity option"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => profanityPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="profanityPopover">
              <div class="max-w-xs">
                <p class="text-sm mb-2">Setting for dealing with profanity:</p>
                <p class="text-sm">
                  <strong>raw</strong>: swear words are kept<br />
                  <strong>remove</strong>: swear words are removed<br />
                  <strong>mask</strong>: swear words are replaced by ***
                </p>
              </div>
            </Popover>
          </div>

          <!-- Stable Partial Result Threshold -->
          <div class="flex flex-col gap-2">
            <label for="threshold" class="font-medium text-sm"
              >Partial Result Threshold</label
            >
            <div class="flex items-stretch w-full">
              <Select
                id="threshold"
                v-model="store.settings.stablePartialResultThreshold"
                :options="partialThresholds"
                :disabled="inputsDisabled"
                placeholder="Select threshold"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => thresholdPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="thresholdPopover">
              <div class="max-w-sm">
                <p class="text-sm mb-2">
                  Real-time translation presents tradeoffs with respect to
                  latency versus accuracy. You could show the text as soon as
                  possible. However, if you can accept some latency, you can
                  improve the accuracy of the caption by setting a higher
                  'partial results threshold'.
                </p>
                <p class="text-sm">
                  The value that you set is the number of times a word has to be
                  recognized before the Speech service returns a live
                  translation.
                </p>
              </div>
            </Popover>
          </div>

          <!-- Phrase List -->
          <div class="flex flex-col gap-2 md:col-span-2">
            <label for="phrases" class="font-medium text-sm">Phrase List</label>
            <div class="flex items-stretch w-full">
              <InputText
                id="phrases"
                v-model="store.settings.phraseList"
                placeholder="Oeschelbronn;Schaan;Paul"
                :disabled="inputsDisabled"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => phraseListPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="phraseListPopover">
              <div class="max-w-sm">
                <p class="text-sm mb-2">
                  A phrase list is a list of words or phrases that you can
                  provide before starting the translation. Adding a phrase to a
                  phrase list increases its importance, thus making it more
                  likely to be recognized.
                </p>
                <p class="text-sm mb-2">
                  Examples of phrases include: Names, Geographical locations,
                  Homonyms, Words or acronyms unique to your industry or
                  organization.
                </p>
                <p class="text-sm">
                  Phrases need to be separated by a semicolon.
                </p>
              </div>
            </Popover>
          </div>
        </div>
      </Fieldset>

      <!-- Presentation Styling Options -->
      <Fieldset
        legend="Presentation Options"
        :collapsed="true"
        :toggleable="true"
      >
        <!-- TODO: Volt doesnt support custom legends in combination with toggleable fieldsets yet -->
        <!-- <template #legend>
          <div class="flex items-center gap-2">
            <i class="pi pi-palette"></i>
            <span class="font-semibold">Presentation Options</span>
          </div>
        </template> -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Font -->
          <div class="flex flex-col gap-2">
            <label for="font" class="font-medium text-sm">Font</label>
            <div class="flex items-stretch w-full">
              <Select
                id="font"
                v-model="store.settings.presentation.font"
                :options="presentationFonts"
                :disabled="inputsDisabled"
                placeholder="Select font"
                pt:root="flex-1 rounded-e-none"
              >
                <template #option="{ option }">
                  <span :style="{ fontFamily: option }">{{ option }}</span>
                </template>
              </Select>
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => fontPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="fontPopover">
              <div class="max-w-xs">
                <p class="text-sm">
                  Font used to display the translated text. Make sure the font
                  has all the characters of the selected output language.
                </p>
              </div>
            </Popover>
          </div>

          <!-- Font Size -->
          <div class="flex flex-col gap-2">
            <label for="font-size" class="font-medium text-sm">Font Size</label>
            <div class="flex items-stretch w-full">
              <InputText
                id="font-size"
                v-model="store.settings.presentation.fontSize"
                placeholder="2em / 30px"
                :disabled="inputsDisabled"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => fontSizePopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="fontSizePopover">
              <div class="max-w-xs">
                <p class="text-sm">
                  Font size of the translated text. You can specify the size in
                  any CSS unit (px, em, rem...).
                </p>
              </div>
            </Popover>
          </div>

          <!-- Margin -->
          <div class="flex flex-col gap-2">
            <label for="margin" class="font-medium text-sm"
              >Paragraph Margin</label
            >
            <div class="flex items-stretch w-full">
              <InputText
                id="margin"
                v-model="store.settings.presentation.margin"
                placeholder="1em 2em"
                :disabled="inputsDisabled"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => marginPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="marginPopover">
              <div class="max-w-sm">
                <p class="text-sm">
                  Distance of the translated paragraphs to each other and to the
                  screen border. Specifications in 'px' and in 'em' are allowed.
                  To control all sides individually, e.g. '1em 4em 1em 2em' can
                  be used (top, right, bottom, left).
                </p>
              </div>
            </Popover>
          </div>

          <!-- Text Color -->
          <div class="flex flex-col gap-2">
            <label for="color" class="font-medium text-sm">Text Color</label>
            <div class="flex items-stretch w-full">
              <InputText
                id="color"
                v-model="store.settings.presentation.color"
                placeholder="white / #fff"
                :disabled="inputsDisabled"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => colorPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="colorPopover">
              <div class="max-w-xs">
                <p class="text-sm">
                  Color of the translated text. You can specify colors with html
                  names, rgb, and hex.
                </p>
              </div>
            </Popover>
          </div>

          <!-- Live Text Color -->
          <div class="flex flex-col gap-2">
            <label for="live-color" class="font-medium text-sm"
              >Live Text Color</label
            >
            <div class="flex items-stretch w-full">
              <InputText
                id="live-color"
                v-model="store.settings.presentation.liveColor"
                placeholder="gray / #999"
                :disabled="inputsDisabled"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => liveColorPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="liveColorPopover">
              <div class="max-w-xs">
                <p class="text-sm">
                  Color of the live translated text. You can specify colors with
                  html names, rgb, and hex.
                </p>
              </div>
            </Popover>
          </div>

          <!-- Background -->
          <div class="flex flex-col gap-2">
            <label for="background" class="font-medium text-sm"
              >Background</label
            >
            <div class="flex items-stretch w-full">
              <InputText
                id="background"
                v-model="store.settings.presentation.background"
                placeholder="black / #000"
                :disabled="inputsDisabled"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => backgroundPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="backgroundPopover">
              <div class="max-w-sm">
                <p class="text-sm">
                  Background of the presentation view. You can specify colors
                  with html names, rgb, and hex. Also images with e.g. the
                  following syntax: 'center / cover no-repeat
                  url(https://picsum.photos/1920/1080)', or color-gradients
                  with: 'linear-gradient(red, yellow)'.
                </p>
              </div>
            </Popover>
          </div>

          <!-- Presentation Mode -->
          <div class="flex flex-col gap-2">
            <label for="presentation-mode" class="font-medium text-sm"
              >Presentation Mode</label
            >
            <div class="flex items-stretch w-full">
              <Select
                id="presentation-mode"
                v-model="store.settings.presentation.mode"
                :options="presentationModeOptions"
                optionLabel="name"
                optionValue="value"
                :disabled="inputsDisabled || presentationLanguages.length <= 1"
                placeholder="Select presentation mode"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => presentationModePopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="presentationModePopover">
              <div class="max-w-sm">
                <p class="text-sm">
                  <strong>Split-screen:</strong> Shows all languages in a single
                  window with split layout (supports 2-6 languages total,
                  including input language if enabled).
                </p>
                <p class="text-sm mt-2">
                  <strong>Multi-window:</strong> Opens a separate window for
                  each language. Each window shows content for one language
                  only.
                </p>
                <p class="text-sm mt-2 text-surface-500">
                  Note: Single language always uses full-screen display without
                  splitting.
                </p>
              </div>
            </Popover>
          </div>

          <!-- Show Input Language -->
          <div class="flex flex-col gap-2 md:pl-6">
            <label class="font-medium text-sm md:block hidden">&nbsp;</label>
            <div class="flex items-center gap-2 md:h-[42px]">
              <Checkbox
                id="show-input-language"
                v-model="store.settings.presentation.showInputLanguage"
                :binary="true"
                :disabled="inputsDisabled"
              />
              <label
                for="show-input-language"
                class="font-medium text-sm cursor-pointer"
                >Show Input Language</label
              >
              <Button
                icon="pi pi-question-circle"
                severity="secondary"
                text
                size="small"
                @click="(e) => showInputLangPopover.toggle(e)"
                :disabled="inputsDisabled"
              />
            </div>
            <Popover ref="showInputLangPopover">
              <div class="max-w-sm">
                <p class="text-sm">
                  When enabled, the original spoken input will be displayed
                  alongside the translations in the presentation view. In
                  split-screen mode, the input will appear as an additional
                  pane. In multi-window mode, a separate window for the input
                  language will be opened.
                </p>
              </div>
            </Popover>
          </div>
        </div>
      </Fieldset>

      <!-- Controls -->
      <Fieldset>
        <template #legend>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <i class="pi pi-sitemap"></i>
              <span class="font-semibold">Controls</span>
            </div>
            <Badge
              v-if="stateText"
              :value="stateText"
              :severity="statusSeverity"
            />
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <!-- Info about popup blocking in multi-window mode -->
          <Message
            v-if="store.settings.presentation.mode === 'multi-window'"
            severity="info"
            :closable="true"
            icon="pi pi-info-circle"
          >
            <strong>Browser Popup Blocker:</strong> Multi-window mode opens
            multiple browser windows. Most browsers block this by default. If
            windows don't open, look for a popup blocker icon in your browser's
            address bar and allow popups for this site.
          </Message>

          <!-- Warning for too many languages in split mode -->
          <Message
            v-if="hasTooManyLanguagesForSplit"
            severity="warn"
            :closable="false"
            icon="pi pi-exclamation-triangle"
          >
            <div v-if="store.settings.presentation.showInputLanguage">
              Split-screen presentation mode supports up to 6 languages total (5
              output + 1 input). You have
              {{ presentationLanguages.length }} selected ({{
                store.settings.outputLanguages.length
              }}
              output + 1 input). Please reduce the number of output languages or
              disable "Show Input Language".
            </div>
            <div v-else>
              Split-screen presentation mode supports up to 6 output languages.
              You have {{ store.settings.outputLanguages.length }} selected.
              Please reduce the number of output languages or switch to
              Multi-window mode.
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
                  @click="startTest"
                  :disabled="
                    state.isPresentationRunning ||
                    state.isTestRunning ||
                    state.isTestPresentationRunning
                  "
                  class="test-button w-full"
                />
                <SecondaryButton
                  label="Test Presentation"
                  icon="pi pi-external-link"
                  @click="startTestPresentation"
                  :disabled="
                    state.isPresentationRunning ||
                    state.isTestRunning ||
                    state.isTestPresentationRunning ||
                    state.presentationWindowsOpenedButNotStarted ||
                    hasTooManyLanguagesForSplit
                  "
                  severity="secondary"
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
                  @click="startPresentation"
                  :disabled="
                    state.isPresentationRunning ||
                    state.isTestRunning ||
                    state.isTestPresentationRunning ||
                    state.presentationWindowsOpenedButNotStarted ||
                    hasTooManyLanguagesForSplit
                  "
                  severity="secondary"
                />
                <DangerButton
                  v-if="
                    state.presentationWindowsOpenedButNotStarted &&
                    state.isPresentationRunning &&
                    !state.isRecordingStarted
                  "
                  label="Start Recording"
                  icon="pi pi-microphone"
                  @click="startRecording"
                />
                <DangerButton
                  v-if="
                    state.presentationWindowsOpenedButNotStarted &&
                    state.isTestPresentationRunning &&
                    !state.isRecordingStarted
                  "
                  label="Start Test"
                  icon="pi pi-compass"
                  @click="startTestGeneration"
                />
                <Button
                  v-if="state.isPaused"
                  label="Resume"
                  icon="pi pi-play"
                  @click="pauseOrResume"
                  :disabled="
                    !(
                      (state.isPresentationRunning &&
                        state.isRecordingStarted) ||
                      state.isTestRunning ||
                      (state.isTestPresentationRunning &&
                        !state.presentationWindowsOpenedButNotStarted)
                    )
                  "
                />
                <Button
                  v-else
                  label="Pause"
                  icon="pi pi-pause"
                  @click="pauseOrResume"
                  :disabled="
                    !(
                      (state.isPresentationRunning &&
                        state.isRecordingStarted) ||
                      state.isTestRunning ||
                      (state.isTestPresentationRunning &&
                        !state.presentationWindowsOpenedButNotStarted)
                    )
                  "
                  severity="warning"
                />
                <Button
                  label="Stop"
                  icon="pi pi-stop"
                  @click="stop"
                  :disabled="
                    !(
                      state.isPresentationRunning ||
                      state.isTestRunning ||
                      state.isTestPresentationRunning ||
                      state.presentationWindowsOpenedButNotStarted
                    )
                  "
                  severity="danger"
                  outlined
                />
              </div>
            </div>
          </div>
          <div class="text-xs text-surface-500 flex items-center justify-end">
            <span>
              Open the presentation first, enter fullscreen/place window(s),
              then start & control from here.
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
                    v-model="selectedVariantForDisplay"
                    :options="store.settingVariants"
                    optionLabel="value.name"
                    optionValue="id"
                    placeholder="Select a variant"
                    @change="onVariantChange"
                    :disabled="inputsDisabled"
                    class="flex-1"
                  />
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    outlined
                    @click="confirmDeleteVariant"
                    :disabled="
                      inputsDisabled ||
                      store.settingVariants.length <= 1 ||
                      isDefaultVariantSelected
                    "
                    v-tooltip.top="'Delete variant'"
                  />
                </div>
              </div>

              <!-- Save Buttons -->
              <div class="flex gap-2 items-end">
                <ContrastButton
                  label="Save"
                  icon="pi pi-save"
                  @click="saveCurrentVariant"
                  :disabled="
                    inputsDisabled ||
                    store.settingsSaving ||
                    !store.hasUnsavedChanges ||
                    isDefaultVariantSelected ||
                    hasInvalidLanguages
                  "
                  :loading="store.settingsSaving"
                />
                <ContrastButton
                  label="Save As..."
                  icon="pi pi-plus"
                  variant="outlined"
                  @click="promptSaveAsNewVariant"
                  :disabled="inputsDisabled || hasInvalidLanguages"
                />
              </div>
            </div>
            <div
              v-if="store.hasUnsavedChanges"
              class="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1"
            >
              <i class="pi pi-exclamation-triangle"></i>
              <span v-if="isDefaultVariantSelected">
                You have unsaved changes. Use "Save As..." to create a new
                variant.
              </span>
              <span v-else> You have unsaved changes </span>
            </div>
          </div>
        </div>
      </Fieldset>

      <!-- Test Mode Output -->
      <div
        v-if="state.isTestRunning"
        class="grid gap-4 grid-cols-1 md:grid-cols-2"
      >
        <Fieldset v-for="lang in operatorLanguages" :key="lang.code">
          <template #legend>
            <span class="font-semibold">
              {{
                getLanguageDisplayName(
                  lang.code,
                  lang.isInput ? 'input' : 'output',
                )
              }}
            </span>
          </template>
          <div
            :ref="
              (el) => {
                if (el) testOutputLangRefs[lang.code] = el as HTMLDivElement;
              }
            "
            class="space-y-2 max-h-96 overflow-y-auto"
          >
            <p
              v-for="(paragraph, index) in finalizedParagraphsByLang[
                lang.code
              ] || []"
              :key="'trans-' + lang.code + '-' + index"
              class="text-sm"
            >
              {{ paragraph }}
            </p>
            <p
              v-if="currentLiveTranslationByLang[lang.code]"
              class="text-sm text-surface-500"
            >
              {{ currentLiveTranslationByLang[lang.code] }}
            </p>
          </div>
        </Fieldset>
      </div>
    </div>
  </div>

  <!-- Save As Dialog -->
  <Dialog
    v-model:visible="saveAsDialogVisible"
    header="Save As New Variant"
    :modal="true"
    :closable="true"
    :style="{ width: '450px' }"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label for="variant-name" class="font-medium text-sm"
          >Variant Name</label
        >
        <InputText
          id="variant-name"
          v-model="newVariantName"
          placeholder="Enter variant name"
          @keyup.enter="saveAsNewVariant"
          autofocus
        />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="saveAsDialogVisible = false"
        />
        <Button
          label="Save"
          @click="saveAsNewVariant"
          :disabled="!newVariantName.trim()"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from 'vue';
import { useTranslatorStore } from '../stores/translator';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { CaptioningService } from '../services/captioning';
import { SessionLogger } from '../services/sessionLogger';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';

import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import ContrastButton from '@churchtools-extensions/prime-volt/ContrastButton.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import Multiselect from '@churchtools-extensions/prime-volt/Multiselect.vue';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import Checkbox from '@churchtools-extensions/prime-volt/Checkbox.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Popover from '@churchtools-extensions/prime-volt/Popover.vue';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import translationOptions from '../translation-options.json';
import { getLanguageDisplayName } from '../utils/languageHelpers';
import { LoremIpsum } from 'lorem-ipsum';

interface LanguageItem {
  code: string;
  isInput: boolean;
}

const store = useTranslatorStore();
const confirm = useConfirm();
const toast = useToast();

// Popover refs for info buttons
const inputLangPopover = ref();
const outputLangPopover = ref();
const profanityPopover = ref();
const thresholdPopover = ref();
const phraseListPopover = ref();
const fontPopover = ref();
const fontSizePopover = ref();
const marginPopover = ref();
const colorPopover = ref();
const liveColorPopover = ref();
const backgroundPopover = ref();
const presentationModePopover = ref();
const showInputLangPopover = ref();

// State
const state = ref({
  isTestRunning: false,
  isPresentationRunning: false,
  isPaused: false,
  isRecordingStarted: false, // Tracks if recording/generation has started (after Start button clicked)
  presentationSessionId: null as string | null, // Unique ID for this presentation session
  isTestPresentationRunning: false, // Tracks if test presentation mode is active
  presentationWindowsOpenedButNotStarted: false, // Tracks if presentation windows are opened but not started
});

const error = ref<string | null>(null);
const user = ref<Person | null>(null);
const currentSession = ref<any>(null);

// Variant management
const selectedVariantForDisplay = ref<number | null>(null);
const saveAsDialogVisible = ref(false);
const newVariantName = ref('');

// Captioning service instance
let captioningService: CaptioningService | null = null;
const sessionLogger = new SessionLogger();
let heartbeatInterval: NodeJS.Timeout | null = null;
let testPresentationInterval: NodeJS.Timeout | null = null;

// Lorem Ipsum generator for test presentations
const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 5,
    min: 1,
  },
  wordsPerSentence: {
    max: 20,
    min: 4,
  },
});

// Test mode output
// Store translations per language: { languageCode: ['paragraph1', 'paragraph2', ...] }
// Input language is stored here as well (when showInputLanguage is enabled)
const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
const currentLiveTranslationByLang = ref<Record<string, string>>({});

// Refs for scrollable test output containers
const testOutputLangRefs = ref<Record<string, HTMLDivElement>>({});

// Language options (imported from JSON config)
const inputLanguages = translationOptions.inputLanguages;
const outputLanguages = translationOptions.outputLanguages;
const profanityOptions = translationOptions.profanityOptions;
const partialThresholds = translationOptions.partialThresholds;
const presentationFonts = translationOptions.presentationFonts;

// Presentation mode options
const presentationModeOptions = [
  { name: 'Split-screen (2-6 languages)', value: 'split' },
  { name: 'Multi-window', value: 'multi-window' },
];

// Generate unique session ID for presentation isolation
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Computed properties for language validation
const inputLanguageValid = computed(() => {
  return inputLanguages.some(
    (lang) => lang.code === store.settings.inputLanguage,
  );
});

const outputLanguagesValid = computed(() => {
  if (
    !store.settings.outputLanguages ||
    store.settings.outputLanguages.length === 0
  ) {
    return false;
  }
  return store.settings.outputLanguages.every((code) =>
    outputLanguages.some((lang) => lang.code === code),
  );
});

const hasInvalidLanguages = computed(() => {
  return !inputLanguageValid.value || !outputLanguagesValid.value;
});

// All languages with their roles (input + outputs)
const allLanguages = computed<LanguageItem[]>(() => {
  const langs: LanguageItem[] = [];

  // Always add input language first
  langs.push({
    code: store.settings.inputLanguage,
    isInput: true,
  });

  // Add all output languages
  for (const langCode of store.settings.outputLanguages) {
    langs.push({
      code: langCode,
      isInput: false,
    });
  }

  return langs;
});

// Languages for operator views (test mode, future monitoring) - always includes input
const operatorLanguages = computed<LanguageItem[]>(() => {
  return allLanguages.value;
});

// Languages for presentation windows (audience view) - respects checkbox
const presentationLanguages = computed<LanguageItem[]>(() => {
  return allLanguages.value.filter((lang) => {
    // Always include output languages
    if (!lang.isInput) return true;
    // Only include input if setting is enabled
    return store.settings.presentation.showInputLanguage;
  });
});

// Check if split-screen mode has too many languages
const hasTooManyLanguagesForSplit = computed(() => {
  return (
    store.settings.presentation.mode === 'split' &&
    presentationLanguages.value.length > 6
  );
});

// Computed
const hasApiCredentials = computed(() => {
  return !!store.apiSettings.azureApiKey && !!store.apiSettings.azureRegion;
});

const inputsDisabled = computed(() => {
  return (
    state.value.isTestRunning ||
    state.value.isPresentationRunning ||
    store.settingsSaving
  );
});

const stateText = computed(() => {
  if (state.value.isPaused) {
    return state.value.isTestRunning ? 'Test Paused' : 'Presentation Paused';
  } else if (state.value.isTestRunning) {
    return 'Testing';
  } else if (state.value.isPresentationRunning) {
    return 'Presenting';
  }
  return '';
});

const statusSeverity = computed(() => {
  if (state.value.isPaused) {
    return 'warn';
  } else if (state.value.isTestRunning || state.value.isPresentationRunning) {
    return 'success';
  }
  return 'secondary';
});

const isDefaultVariantSelected = computed(() => {
  const currentVariant = store.settingVariants.find(
    (v) => v.id === store.selectedVariantId,
  );
  return currentVariant?.value.name === 'Default';
});

// Load current user
async function loadUser() {
  try {
    user.value = await churchtoolsClient.get<Person>('/whoami');
  } catch (e) {
    console.error('Failed to load user', e);
  }
}

// Start sending heartbeat updates every 30 seconds
function startHeartbeat() {
  stopHeartbeat(); // Clear any existing interval

  heartbeatInterval = setInterval(() => {
    const sessionId = sessionLogger.getCurrentSessionId();
    if (sessionId) {
      // Non-blocking heartbeat update
      store.updateHeartbeat(sessionId).catch(() => {
        // Silent fail - already logged in store
      });
    }
  }, 30000); // 30 seconds
}

// Stop heartbeat updates
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Handle window close - try to end session gracefully
function handleWindowClose() {
  const sessionId = sessionLogger.getCurrentSessionId();
  if (sessionId && currentSession.value) {
    try {
      // Attempt to end session, but browser may close before async call completes
      // Sessions without endTime will be detected as "abandoned" based on lastHeartbeat
      const endedSession = sessionLogger.endSession(
        currentSession.value,
        'completed',
      );
      // Note: This async call will likely not complete before page unload
      // The session will be marked as abandoned (status='running' with old lastHeartbeat)
      store.endSession(sessionId, endedSession);
    } catch (e) {
      // Silent fail on unload
      console.warn('Could not end session on close:', e);
    }
  }
}

// Translation callbacks
function onTranslating(translations: Record<string, string>, original: string) {
  // Build translations for operator (always includes input)
  const operatorTranslations = { ...translations };
  operatorTranslations[store.settings.inputLanguage] = original;

  // Store full operator view
  currentLiveTranslationByLang.value = operatorTranslations;

  // Scroll test output to bottom
  if (state.value.isTestRunning) {
    scrollTestOutputToBottom();
  }

  // Update presentation window if running (filter for audience)
  if (state.value.isPresentationRunning) {
    // Build translations for presentation (respects checkbox)
    const presentationTranslations = { ...translations };
    if (store.settings.presentation.showInputLanguage) {
      presentationTranslations[store.settings.inputLanguage] = original;
    }
    updatePresentationWindow(presentationTranslations, true);
  }
}

function onTranslated(translations: Record<string, string>, original: string) {
  // Add translations to each language's finalized paragraphs (output languages)
  for (const [lang, translation] of Object.entries(translations)) {
    if (!finalizedParagraphsByLang.value[lang]) {
      finalizedParagraphsByLang.value[lang] = [];
    }
    finalizedParagraphsByLang.value[lang].push(translation);
  }

  // Always add input language for operator monitoring
  if (!finalizedParagraphsByLang.value[store.settings.inputLanguage]) {
    finalizedParagraphsByLang.value[store.settings.inputLanguage] = [];
  }
  finalizedParagraphsByLang.value[store.settings.inputLanguage].push(original);

  // Clear live translations
  currentLiveTranslationByLang.value = {};

  // Scroll test output to bottom
  if (state.value.isTestRunning) {
    scrollTestOutputToBottom();
  }

  // Update presentation window if running
  if (state.value.isPresentationRunning) {
    // Build translations for presentation (respects checkbox)
    const presentationTranslations = { ...translations };
    if (store.settings.presentation.showInputLanguage) {
      presentationTranslations[store.settings.inputLanguage] = original;
    }
    updatePresentationWindow(presentationTranslations, false);
  }
}

function onError(errorMsg: string) {
  error.value = errorMsg;
  stop();
}

// Scroll test output containers to bottom
function scrollTestOutputToBottom() {
  nextTick(() => {
    // Scroll all language containers
    Object.values(testOutputLangRefs.value).forEach((element) => {
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    });
  });
}

// Update presentation window via localStorage
function updatePresentationWindow(
  translations: Record<string, string>,
  isLive: boolean,
) {
  if (!state.value.presentationSessionId) return;

  const data = {
    translations, // All language translations for current text
    isLive,
    finalized: finalizedParagraphsByLang.value, // All finalized paragraphs per language
    timestamp: Date.now(),
  };
  const key = `translator_presentation_${state.value.presentationSessionId}`;
  localStorage.setItem(key, JSON.stringify(data));
}

// Clear presentation data in localStorage (used on pause/start to avoid showing
// stale content in the presentation window)
function clearPresentationWindowStorage() {
  if (!state.value.presentationSessionId) return;

  const data = {
    translations: {},
    isLive: false,
    finalized: {},
    timestamp: Date.now(),
  };
  const key = `translator_presentation_${state.value.presentationSessionId}`;
  localStorage.setItem(key, JSON.stringify(data));
}

// Start test mode
async function startTest() {
  if (!hasApiCredentials.value) {
    error.value = 'Please configure Azure API credentials first';
    return;
  }

  // Clear previous test output
  finalizedParagraphsByLang.value = {};
  currentLiveTranslationByLang.value = {};

  try {
    // Create captioning service
    captioningService = new CaptioningService(
      {
        inputLanguage: store.settings.inputLanguage,
        outputLanguages: store.settings.outputLanguages,
        profanityOption: store.settings.profanityOption,
        stablePartialResultThreshold:
          store.settings.stablePartialResultThreshold,
        phraseList: store.settings.phraseList,
      },
      {
        onTranslating,
        onTranslated,
        onError,
      },
      store.apiSettings.azureApiKey,
      store.apiSettings.azureRegion,
    );

    captioningService.start();
    state.value.isTestRunning = true;

    // Start session logging
    if (user.value) {
      const session = sessionLogger.createSession({
        userId: user.value.id!,
        userEmail: user.value.email ?? '',
        userName: `${user.value.firstName} ${user.value.lastName}`,
        inputLanguage: store.settings.inputLanguage,
        outputLanguages: store.settings.outputLanguages,
        mode: 'test',
      });
      const sessionId = await store.startSession(session);
      if (sessionId) {
        sessionLogger.setCurrentSessionId(sessionId);
        currentSession.value = session;

        // Start heartbeat updates
        startHeartbeat();
      }
    }

    toast.add({
      severity: 'success',
      summary: 'Test Started',
      detail: 'Speak into your microphone to test translation',
      life: 3000,
    });
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start test';
    console.error('startTest failed', e);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  }
}

// Helper function to open presentation windows and handle common setup
function openPresentationWindows(
  sessionId: string,
  options: {
    isTest: boolean;
    multiWindowSummary: string;
    multiWindowDetail: string;
    singleWindowSummary: string;
    singleWindowDetail: string;
  },
) {
  // Save settings to localStorage with session ID
  localStorage.setItem(
    `translator_settings_${sessionId}`,
    JSON.stringify(store.settings),
  );
  localStorage.removeItem(`translator_paused_${sessionId}`);

  const baseUrl = `${window.location.origin}${window.location.pathname}`;

  // Open presentation windows based on mode
  if (store.settings.presentation.mode === 'multi-window') {
    // Open one window per language (including input if enabled)
    for (const lang of presentationLanguages.value) {
      const url = `${baseUrl}?presentation=true&session=${sessionId}&lang=${encodeURIComponent(lang.code)}`;
      window.open(url, `_blank_${lang.code}`, 'toolbar=0,location=0,menubar=0');
    }
    toast.add({
      severity: 'success',
      summary: options.multiWindowSummary,
      detail: options.multiWindowDetail,
      life: 4000,
    });
  } else {
    // Open single window for split-screen mode
    const url = `${baseUrl}?presentation=true&session=${sessionId}`;
    window.open(url, '_blank', 'toolbar=0,location=0,menubar=0');
    toast.add({
      severity: 'success',
      summary: options.singleWindowSummary,
      detail: options.singleWindowDetail,
      life: 4000,
    });
  }
}

// Start presentation mode
async function startPresentation() {
  if (!hasApiCredentials.value) {
    error.value = 'Please configure Azure API credentials first';
    return;
  }

  // Clear previous output
  finalizedParagraphsByLang.value = {};
  currentLiveTranslationByLang.value = {};

  // Generate unique session ID for this presentation
  const sessionId = generateSessionId();
  state.value.presentationSessionId = sessionId;

  // Clear any existing presentation data to avoid showing previous session
  clearPresentationWindowStorage();

  try {
    state.value.isPresentationRunning = true;
    state.value.presentationWindowsOpenedButNotStarted = true;

    openPresentationWindows(sessionId, {
      isTest: false,
      multiWindowSummary: 'Presentation Windows Opened',
      multiWindowDetail: `${presentationLanguages.value.length} windows opened. Click "Start Recording" to begin.`,
      singleWindowSummary: 'Presentation Window Opened',
      singleWindowDetail: 'Click "Start Recording" to begin.',
    });
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start presentation';
    console.error('startPresentation failed', e);
    state.value.isPresentationRunning = false;
    state.value.presentationSessionId = null;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  }
}

// Start test presentation mode with Lorem Ipsum
async function startTestPresentation() {
  // Clear previous output
  finalizedParagraphsByLang.value = {};
  currentLiveTranslationByLang.value = {};

  // Generate unique session ID for this test presentation
  const sessionId = generateSessionId();
  state.value.presentationSessionId = sessionId;

  // Clear any existing presentation data
  clearPresentationWindowStorage();

  try {
    state.value.isTestPresentationRunning = true;
    state.value.presentationWindowsOpenedButNotStarted = true;

    openPresentationWindows(sessionId, {
      isTest: true,
      multiWindowSummary: 'Test Presentation Windows Opened',
      multiWindowDetail: `${presentationLanguages.value.length} windows opened. Click "Start Test" to begin.`,
      singleWindowSummary: 'Test Presentation Window Opened',
      singleWindowDetail: 'Click "Start Test" to begin.',
    });

    // Initialize finalized paragraphs for all languages (operator gets all)
    for (const lang of operatorLanguages.value) {
      finalizedParagraphsByLang.value[lang.code] = [];
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start test presentation';
    console.error('startTestPresentation failed', e);
    state.value.isTestPresentationRunning = false;
    state.value.presentationSessionId = null;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  }
}

// Start recording for live presentation
async function startRecording() {
  if (!hasApiCredentials.value) {
    error.value = 'Please configure Azure API credentials first';
    return;
  }

  try {
    state.value.isRecordingStarted = true;
    state.value.presentationWindowsOpenedButNotStarted = false;

    // Create captioning service
    captioningService = new CaptioningService(
      {
        inputLanguage: store.settings.inputLanguage,
        outputLanguages: store.settings.outputLanguages,
        profanityOption: store.settings.profanityOption,
        stablePartialResultThreshold:
          store.settings.stablePartialResultThreshold,
        phraseList: store.settings.phraseList,
      },
      {
        onTranslating,
        onTranslated,
        onError,
      },
      store.apiSettings.azureApiKey,
      store.apiSettings.azureRegion,
    );

    captioningService.start();

    // Start session logging
    if (user.value) {
      const session = sessionLogger.createSession({
        userId: user.value.id!,
        userEmail: user.value.email ?? '',
        userName: `${user.value.firstName} ${user.value.lastName}`,
        inputLanguage: store.settings.inputLanguage,
        outputLanguages: store.settings.outputLanguages,
        mode: 'presentation',
      });
      const sessionId = await store.startSession(session);
      if (sessionId) {
        sessionLogger.setCurrentSessionId(sessionId);
        currentSession.value = session;

        // Start heartbeat updates
        startHeartbeat();
      }
    }

    toast.add({
      severity: 'success',
      summary: 'Recording Started',
      detail: 'Speak into your microphone',
      life: 3000,
    });
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start recording';
    console.error('startRecording failed', e);
    state.value.isRecordingStarted = false;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  }
}

// Start lorem ipsum generation for test presentation
function startTestGeneration() {
  try {
    state.value.isRecordingStarted = true;
    state.value.presentationWindowsOpenedButNotStarted = false;

    // Start generating lorem ipsum content
    let showLive = true;
    testPresentationInterval = setInterval(() => {
      if (!state.value.isPaused) {
        if (showLive) {
          // Show live translation (preview) - different text per language
          const liveTranslations: Record<string, string> = {};
          // Generate for ALL languages (operator view)
          for (const lang of operatorLanguages.value) {
            const liveText = lorem.generateSentences(1);
            liveTranslations[lang.code] = liveText;
            currentLiveTranslationByLang.value[lang.code] = liveText;
          }

          // But only send presentation languages to windows
          const presentationLiveTranslations: Record<string, string> = {};
          for (const lang of presentationLanguages.value) {
            presentationLiveTranslations[lang.code] =
              liveTranslations[lang.code];
          }
          updatePresentationWindow(presentationLiveTranslations, true);
        } else {
          // Finalize the paragraph - different text per language with line numbers
          // Generate for ALL languages (operator view)
          for (const lang of operatorLanguages.value) {
            // Ensure array exists for this language
            if (!finalizedParagraphsByLang.value[lang.code]) {
              finalizedParagraphsByLang.value[lang.code] = [];
            }
            const paragraph = lorem.generateParagraphs(1);
            const lineNumber =
              finalizedParagraphsByLang.value[lang.code].length + 1;
            const numberedParagraph = `${lineNumber}. ${paragraph}`;
            finalizedParagraphsByLang.value[lang.code].push(numberedParagraph);
          }

          currentLiveTranslationByLang.value = {};
          updatePresentationWindow({}, false);
        }
        showLive = !showLive;
      }
    }, 800);

    toast.add({
      severity: 'success',
      summary: 'Test Generation Started',
      detail: 'Lorem ipsum content flowing',
      life: 3000,
    });
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start test generation';
    console.error('startTestGeneration failed', e);
    state.value.isRecordingStarted = false;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  }
}

// Pause or resume
function pauseOrResume() {
  const sessionId = sessionLogger.getCurrentSessionId();

  if (state.value.isPaused) {
    // Resume
    if (state.value.isTestRunning) {
      captioningService?.start();
    }
    if (state.value.isPresentationRunning) {
      // Clear presenter's state to avoid showing stale content when resuming
      finalizedParagraphsByLang.value = {};
      currentLiveTranslationByLang.value = {};
      clearPresentationWindowStorage();
      if (state.value.presentationSessionId) {
        localStorage.removeItem(
          `translator_paused_${state.value.presentationSessionId}`,
        );
      }
      captioningService?.start();
    }
    if (state.value.isTestPresentationRunning) {
      // Resume test presentation - just remove paused flag
      if (state.value.presentationSessionId) {
        localStorage.removeItem(
          `translator_paused_${state.value.presentationSessionId}`,
        );
      }
    }

    // Resume heartbeat and session tracking
    if (sessionId) {
      store.resumeSession(sessionId);
      startHeartbeat();
    }
  } else {
    // Pause
    if (captioningService) {
      captioningService.stop();
    }
    if (state.value.isPresentationRunning) {
      // Clear presentation window and presenter's state to avoid showing
      // stale content when paused
      finalizedParagraphsByLang.value = {};
      currentLiveTranslationByLang.value = {};
      clearPresentationWindowStorage();
      if (state.value.presentationSessionId) {
        localStorage.setItem(
          `translator_paused_${state.value.presentationSessionId}`,
          JSON.stringify({ isPaused: true }),
        );
      }
    }
    if (state.value.isTestPresentationRunning) {
      // Pause test presentation - keep content, just set paused flag
      if (state.value.presentationSessionId) {
        localStorage.setItem(
          `translator_paused_${state.value.presentationSessionId}`,
          JSON.stringify({ isPaused: true }),
        );
      }
    }

    // Stop heartbeat and mark session as paused
    if (sessionId) {
      stopHeartbeat();
      store.pauseSession(sessionId);
    }
  }
  state.value.isPaused = !state.value.isPaused;
}

// Stop
function stop() {
  // Handle pre-start state (windows opened but not started)
  if (state.value.presentationWindowsOpenedButNotStarted) {
    // Clean up session-based localStorage
    if (state.value.presentationSessionId) {
      localStorage.removeItem(
        `translator_settings_${state.value.presentationSessionId}`,
      );
      localStorage.removeItem(
        `translator_paused_${state.value.presentationSessionId}`,
      );
      localStorage.removeItem(
        `translator_presentation_${state.value.presentationSessionId}`,
      );
    }

    state.value.isPresentationRunning = false;
    state.value.isTestPresentationRunning = false;
    state.value.presentationWindowsOpenedButNotStarted = false;
    state.value.presentationSessionId = null;

    toast.add({
      severity: 'info',
      summary: 'Presentation Aborted',
      detail: 'Windows will close',
      life: 3000,
    });
    return;
  }

  if (state.value.isTestRunning) {
    captioningService?.stop();
    state.value.isTestRunning = false;
    state.value.isPaused = false;

    // Stop heartbeat
    stopHeartbeat();

    // End session
    const sessionId = sessionLogger.getCurrentSessionId();
    if (sessionId && currentSession.value) {
      try {
        const endedSession = sessionLogger.endSession(
          currentSession.value,
          'completed',
        );
        store.endSession(sessionId, endedSession);
      } catch (e) {
        console.error('Failed to end session:', e);
      } finally {
        sessionLogger.clearCurrentSession();
        currentSession.value = null;
      }
    }
  }

  if (state.value.isTestPresentationRunning) {
    // Stop lorem ipsum generation
    if (testPresentationInterval) {
      clearInterval(testPresentationInterval);
      testPresentationInterval = null;
    }

    // Clean up session-based localStorage
    if (state.value.presentationSessionId) {
      localStorage.removeItem(
        `translator_settings_${state.value.presentationSessionId}`,
      );
      localStorage.removeItem(
        `translator_paused_${state.value.presentationSessionId}`,
      );
      localStorage.removeItem(
        `translator_presentation_${state.value.presentationSessionId}`,
      );
    }

    state.value.isTestPresentationRunning = false;
    state.value.isPaused = false;
    state.value.isRecordingStarted = false;
    state.value.presentationWindowsOpenedButNotStarted = false;
    state.value.presentationSessionId = null;

    toast.add({
      severity: 'info',
      summary: 'Test Presentation Stopped',
      life: 3000,
    });
  }

  if (state.value.isPresentationRunning) {
    confirm.require({
      message: 'Are you sure you want to stop the presentation?',
      header: 'Confirm Stop',
      icon: 'pi pi-exclamation-triangle',
      rejectProps: {
        label: 'Cancel',
        severity: 'secondary',
      },
      acceptProps: {
        label: 'Stop',
      },
      accept: () => {
        captioningService?.stop();

        // Clean up session-based localStorage
        if (state.value.presentationSessionId) {
          localStorage.removeItem(
            `translator_settings_${state.value.presentationSessionId}`,
          );
          localStorage.removeItem(
            `translator_paused_${state.value.presentationSessionId}`,
          );
          localStorage.removeItem(
            `translator_presentation_${state.value.presentationSessionId}`,
          );
        }

        state.value.isPresentationRunning = false;
        state.value.isPaused = false;
        state.value.isRecordingStarted = false;
        state.value.presentationWindowsOpenedButNotStarted = false;
        state.value.presentationSessionId = null;

        // Stop heartbeat
        stopHeartbeat();

        // End session
        const sessionId = sessionLogger.getCurrentSessionId();
        if (sessionId && currentSession.value) {
          try {
            const endedSession = sessionLogger.endSession(
              currentSession.value,
              'completed',
            );
            store.endSession(sessionId, endedSession);
          } catch (e) {
            console.error('Failed to end session:', e);
          } finally {
            sessionLogger.clearCurrentSession();
            currentSession.value = null;
          }
        }

        toast.add({
          severity: 'info',
          summary: 'Presentation Stopped',
          life: 3000,
        });
      },
    });
  }
}

// Variant management methods
function onVariantChange(event: any) {
  const newVariantId = event.value;

  // Check for unsaved changes
  if (store.hasUnsavedChanges) {
    confirm.require({
      message:
        'You have unsaved changes. Do you want to discard them and switch variants?',
      header: 'Unsaved Changes',
      icon: 'pi pi-exclamation-triangle',
      rejectProps: {
        label: 'Cancel',
        severity: 'secondary',
      },
      acceptProps: {
        label: 'Discard Changes',
        severity: 'danger',
      },
      accept: async () => {
        await store.selectVariant(newVariantId, user.value?.id);
        selectedVariantForDisplay.value = newVariantId;
      },
      reject: () => {
        // Revert to current selection
        selectedVariantForDisplay.value = store.selectedVariantId;
      },
    });
  } else {
    store.selectVariant(newVariantId, user.value?.id);
    selectedVariantForDisplay.value = newVariantId;
  }
}

async function saveCurrentVariant() {
  if (hasInvalidLanguages.value) {
    toast.add({
      severity: 'warn',
      summary: 'Invalid Configuration',
      detail: 'Please select valid input and output languages before saving',
      life: 3000,
    });
    return;
  }

  try {
    await store.saveCurrentVariant(undefined, user.value?.id);
    toast.add({
      severity: 'success',
      summary: 'Settings Saved',
      detail: 'Your configuration has been saved',
      life: 3000,
    });
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save settings',
      life: 5000,
    });
  }
}

function promptSaveAsNewVariant() {
  newVariantName.value = '';
  saveAsDialogVisible.value = true;
}

async function saveAsNewVariant() {
  if (!newVariantName.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Name Required',
      detail: 'Please enter a name for the new variant',
      life: 3000,
    });
    return;
  }

  if (hasInvalidLanguages.value) {
    toast.add({
      severity: 'warn',
      summary: 'Invalid Configuration',
      detail: 'Please select valid input and output languages before saving',
      life: 3000,
    });
    return;
  }

  try {
    await store.saveCurrentVariant(newVariantName.value.trim(), user.value?.id);
    saveAsDialogVisible.value = false;
    selectedVariantForDisplay.value = store.selectedVariantId;
    toast.add({
      severity: 'success',
      summary: 'Variant Created',
      detail: `"${newVariantName.value}" has been created`,
      life: 3000,
    });
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create variant',
      life: 5000,
    });
  }
}

function confirmDeleteVariant() {
  const currentVariant = store.settingVariants.find(
    (v) => v.id === store.selectedVariantId,
  );
  if (!currentVariant) return;

  confirm.require({
    message: `Are you sure you want to delete the variant "${currentVariant.value.name}"?`,
    header: 'Delete Variant',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger',
    },
    accept: async () => {
      try {
        await store.deleteVariant(store.selectedVariantId!);
        selectedVariantForDisplay.value = store.selectedVariantId;
        toast.add({
          severity: 'success',
          summary: 'Variant Deleted',
          detail: `"${currentVariant.value.name}" has been deleted`,
          life: 3000,
        });
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete variant',
          life: 5000,
        });
      }
    },
  });
}

// Initialize
loadUser();

// Sync selectedVariantForDisplay with store
watch(
  () => store.selectedVariantId,
  (newId) => {
    if (newId !== null) {
      selectedVariantForDisplay.value = newId;
    }
  },
  { immediate: true },
);

// Mark settings as changed when they're modified
watch(
  () => store.settings,
  () => {
    if (!store.settingsLoading && !store.selectingVariant) {
      store.markSettingsChanged();
    }
  },
  { deep: true },
);

// Listen for presentation window close via storage events
function handleStorageEvent(e: StorageEvent) {
  const sessionId = state.value.presentationSessionId;
  if (!sessionId) return;

  if (e.key === `translator_settings_${sessionId}` && e.newValue === null) {
    // Presentation window was closed, stop everything
    if (state.value.isPresentationRunning) {
      captioningService?.stop();
      state.value.isPresentationRunning = false;
      state.value.isPaused = false;
      state.value.isRecordingStarted = false;
      state.value.presentationWindowsOpenedButNotStarted = false;
      state.value.presentationSessionId = null;

      // Stop heartbeat
      stopHeartbeat();

      // End session
      const sessionId = sessionLogger.getCurrentSessionId();
      if (sessionId && currentSession.value) {
        try {
          const endedSession = sessionLogger.endSession(
            currentSession.value,
            'completed',
          );
          store.endSession(sessionId, endedSession);
        } catch (e) {
          console.error('Failed to end session:', e);
        } finally {
          sessionLogger.clearCurrentSession();
          currentSession.value = null;
        }
      }

      toast.add({
        severity: 'info',
        summary: 'Presentation Stopped',
        detail: 'Presentation window was closed',
        life: 3000,
      });
    } else if (state.value.isTestPresentationRunning) {
      // Test presentation window was closed
      if (testPresentationInterval) {
        clearInterval(testPresentationInterval);
        testPresentationInterval = null;
      }

      state.value.isTestPresentationRunning = false;
      state.value.isPaused = false;
      state.value.isRecordingStarted = false;
      state.value.presentationWindowsOpenedButNotStarted = false;
      state.value.presentationSessionId = null;

      toast.add({
        severity: 'info',
        summary: 'Test Presentation Stopped',
        detail: 'Presentation window was closed',
        life: 3000,
      });
    }
  }
}

// Setup window close handler
onMounted(() => {
  window.addEventListener('beforeunload', handleWindowClose);
  window.addEventListener('storage', handleStorageEvent);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleWindowClose);
  window.removeEventListener('storage', handleStorageEvent);
  stopHeartbeat();
});
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
