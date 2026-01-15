import { ref, watch, computed } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import { useSettingsStore } from '../stores/settings';

/**
 * Composable for managing translator setting variants
 * Handles CRUD operations, unsaved changes dialog, and sync with store
 */
export function useVariantManagement(
  user: { value: Person | null },
  hasInvalidLanguages: { value: boolean },
) {
  const store = useSettingsStore();
  const confirm = useConfirm();
  const toast = useToast();

  // Local state
  const selectedVariantForDisplay = ref<number | null>(null);
  const saveAsDialogVisible = ref(false);
  const newVariantName = ref('');

  // Computed
  const isDefaultVariantSelected = computed(() => {
    const currentVariant = store.settingVariants.find(
      (v) => v.id === store.selectedVariantId,
    );
    return currentVariant?.value.name === 'Default';
  });

  // Handle variant selection with unsaved changes check
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

  // Save current variant
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

  // Open save-as dialog
  function promptSaveAsNewVariant() {
    newVariantName.value = '';
    saveAsDialogVisible.value = true;
  }

  // Save as new variant
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
      await store.saveCurrentVariant(
        newVariantName.value.trim(),
        user.value?.id,
      );
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

  // Confirm and delete variant
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

  // Watch settings for changes and intelligently detect if they differ from clean state
  watch(
    () => store.settings,
    () => {
      if (!store.settingsLoading && !store.selectingVariant) {
        // Check if settings actually differ from clean state
        store.hasUnsavedChanges = store.hasSettingsChanged();
      }
    },
    { deep: true },
  );

  return {
    // State
    selectedVariantForDisplay,
    saveAsDialogVisible,
    newVariantName,

    // Computed
    isDefaultVariantSelected,

    // Methods
    onVariantChange,
    saveCurrentVariant,
    promptSaveAsNewVariant,
    saveAsNewVariant,
    confirmDeleteVariant,
  };
}
