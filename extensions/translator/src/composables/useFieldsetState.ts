import { ref, watch } from 'vue';

const STORAGE_KEY = 'translator_fieldset_states';
const ENABLED_KEY = 'translator_section_enabled';

interface FieldsetStates {
  translationOptions: boolean;
  presentationOptions: boolean;
  sessionOptions: boolean;
  operatorPreview: boolean;
}

interface EnabledStates {
  presentation: boolean;
  session: boolean;
}

const defaultStates: FieldsetStates = {
  translationOptions: true, // collapsed by default
  presentationOptions: true, // collapsed by default
  sessionOptions: true, // collapsed by default
  operatorPreview: false, // open by default
};

const defaultEnabledStates: EnabledStates = {
  presentation: true, // enabled by default
  session: false, // disabled by default (opt-in)
};

function loadStates(): FieldsetStates {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return { ...defaultStates, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load fieldset states from localStorage', e);
  }
  return { ...defaultStates };
}

function saveStates(states: FieldsetStates): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (e) {
    console.warn('Failed to save fieldset states to localStorage', e);
  }
}

function loadEnabledStates(): EnabledStates {
  try {
    const stored = localStorage.getItem(ENABLED_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultEnabledStates, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load enabled states from localStorage', e);
  }
  return { ...defaultEnabledStates };
}

function saveEnabledStates(states: EnabledStates): void {
  try {
    localStorage.setItem(ENABLED_KEY, JSON.stringify(states));
  } catch (e) {
    console.warn('Failed to save enabled states to localStorage', e);
  }
}

export function useFieldsetState() {
  const states = ref<FieldsetStates>(loadStates());
  const enabledStates = ref<EnabledStates>(loadEnabledStates());

  // Watch for changes and persist to localStorage
  watch(
    states,
    (newStates) => {
      saveStates(newStates);
    },
    { deep: true },
  );

  watch(
    enabledStates,
    (newStates) => {
      saveEnabledStates(newStates);
    },
    { deep: true },
  );

  const translationOptionsCollapsed = ref(states.value.translationOptions);
  const presentationOptionsCollapsed = ref(states.value.presentationOptions);
  const sessionOptionsCollapsed = ref(states.value.sessionOptions);
  const operatorPreviewCollapsed = ref(states.value.operatorPreview);

  const presentationEnabled = ref(enabledStates.value.presentation);
  const sessionEnabled = ref(enabledStates.value.session);

  // Sync individual refs with state object and persist
  watch(translationOptionsCollapsed, (collapsed) => {
    states.value.translationOptions = collapsed;
  });

  watch(presentationOptionsCollapsed, (collapsed) => {
    states.value.presentationOptions = collapsed;
  });

  watch(sessionOptionsCollapsed, (collapsed) => {
    states.value.sessionOptions = collapsed;
  });

  watch(operatorPreviewCollapsed, (collapsed) => {
    states.value.operatorPreview = collapsed;
  });

  watch(presentationEnabled, (enabled) => {
    enabledStates.value.presentation = enabled;
  });

  watch(sessionEnabled, (enabled) => {
    enabledStates.value.session = enabled;
  });

  // Toggle functions that also handle the PrimeVue toggle event format
  function toggleTranslationOptions(event: { value: boolean }) {
    translationOptionsCollapsed.value = event.value;
  }

  function togglePresentationOptions(event: { value: boolean }) {
    presentationOptionsCollapsed.value = event.value;
  }

  function toggleSessionOptions(event: { value: boolean }) {
    sessionOptionsCollapsed.value = event.value;
  }

  function toggleOperatorPreview(event: { value: boolean }) {
    operatorPreviewCollapsed.value = event.value;
  }

  // Force open operator preview (used when starting a test)
  function openOperatorPreview() {
    operatorPreviewCollapsed.value = false;
  }

  return {
    translationOptionsCollapsed,
    presentationOptionsCollapsed,
    sessionOptionsCollapsed,
    operatorPreviewCollapsed,
    presentationEnabled,
    sessionEnabled,
    toggleTranslationOptions,
    togglePresentationOptions,
    toggleSessionOptions,
    toggleOperatorPreview,
    openOperatorPreview,
  };
}
