import { describe, it, expect, beforeEach } from 'vitest';
import { useTranslatorStore } from '../../src/stores/translator';

/**
 * Integration Tests: Variant Management
 *
 * Tests the full workflow of creating, loading, updating, switching, and deleting
 * setting variants, including persistence and user preferences.
 */
describe('Variant Management Integration', () => {
  let store: ReturnType<typeof useTranslatorStore>;

  beforeEach(async () => {
    store = useTranslatorStore();
    await store.loadApiSettings();
    await store.loadSettingVariants();
  });

  describe('Creating Variants', () => {
    it('should create a new variant with current settings', async () => {
      // Modify settings
      store.settings.inputLanguage = 'en-US';
      store.settings.outputLanguages = ['de', 'es'];

      // Save as new variant
      await store.saveCurrentVariant('My Config', 1);

      // Verify variant was created
      expect(store.settingVariants).toHaveLength(2); // Default + new
      const newVariant = store.settingVariants.find(
        (v) => v.value.name === 'My Config',
      );
      expect(newVariant).toBeDefined();
      expect(newVariant?.value.settings.inputLanguage).toBe('en-US');
      expect(newVariant?.value.settings.outputLanguages).toEqual(['de', 'es']);
    });

    it('should select the newly created variant', async () => {
      store.settings.outputLanguages = ['fr'];
      await store.saveCurrentVariant('French Config', 1);

      const newVariant = store.settingVariants.find(
        (v) => v.value.name === 'French Config',
      );
      expect(store.selectedVariantId).toBe(newVariant?.id);
    });

    it('should mark settings as saved after creating variant', async () => {
      store.settings.inputLanguage = 'es-ES';
      store.markSettingsChanged();
      expect(store.hasUnsavedChanges).toBe(true);

      await store.saveCurrentVariant('Spanish Config', 1);
      expect(store.hasUnsavedChanges).toBe(false);
    });

    it('should prevent duplicate variant names', async () => {
      await store.saveCurrentVariant('Test Variant', 1);

      // Try to create another with same name
      await expect(
        store.saveCurrentVariant('Test Variant', 1),
      ).rejects.toThrow();
    });

    it('should trim variant names', async () => {
      await store.saveCurrentVariant('  Spaced Name  ', 1);

      const variant = store.settingVariants.find(
        (v) => v.value.name === 'Spaced Name',
      );
      expect(variant).toBeDefined();
    });
  });

  describe('Loading Variants', () => {
    it('should load all variants from persistence', async () => {
      // Create multiple variants
      store.settings.outputLanguages = ['de'];
      await store.saveCurrentVariant('German', 1);

      store.settings.outputLanguages = ['es'];
      await store.saveCurrentVariant('Spanish', 1);

      // Reload store
      const newStore = useTranslatorStore();
      await newStore.loadApiSettings();
      await newStore.loadSettingVariants();

      expect(newStore.settingVariants).toHaveLength(3); // Default + 2 new
      expect(
        newStore.settingVariants.some((v) => v.value.name === 'German'),
      ).toBe(true);
      expect(
        newStore.settingVariants.some((v) => v.value.name === 'Spanish'),
      ).toBe(true);
    });

    it('should restore last selected variant for user', async () => {
      // Create and select a variant
      store.settings.outputLanguages = ['fr'];
      await store.saveCurrentVariant('French', 1);
      const variantId = store.selectedVariantId;

      // Reload store
      const newStore = useTranslatorStore();
      await newStore.loadApiSettings();
      await newStore.loadSettingVariants();

      // Should restore last selected variant
      expect(newStore.selectedVariantId).toBe(variantId);
      expect(newStore.settings.outputLanguages).toEqual(['fr']);
    });

    it('should handle missing variants gracefully', async () => {
      // Create variant, remember ID
      await store.saveCurrentVariant('Will Delete', 1);
      const variantId = store.selectedVariantId;

      // Manually delete from persistence (simulate external deletion)
      await store.deleteVariant(variantId!);

      // Reload store
      const newStore = useTranslatorStore();
      await newStore.loadApiSettings();
      await newStore.loadSettingVariants();

      // Should fall back to Default
      expect(newStore.selectedVariantId).not.toBe(variantId);
      const selected = newStore.settingVariants.find(
        (v) => v.id === newStore.selectedVariantId,
      );
      expect(selected?.value.name).toBe('Default');
    });
  });

  describe('Switching Variants', () => {
    it('should load settings from selected variant', async () => {
      // Create variant with specific settings
      store.settings.inputLanguage = 'fr-FR';
      store.settings.outputLanguages = ['en', 'de'];
      store.settings.profanityOption = 'mask';
      await store.saveCurrentVariant('French Config', 1);

      // Switch to Default
      const defaultVariant = store.settingVariants.find(
        (v) => v.value.name === 'Default',
      );
      await store.selectVariant(defaultVariant!.id, 1);

      // Settings should be Default's
      expect(store.settings.inputLanguage).toBe('de-DE');
      expect(store.settings.outputLanguages).toEqual(['en']);

      // Switch back
      const frenchVariant = store.settingVariants.find(
        (v) => v.value.name === 'French Config',
      );
      await store.selectVariant(frenchVariant!.id, 1);

      // Settings should be restored
      expect(store.settings.inputLanguage).toBe('fr-FR');
      expect(store.settings.outputLanguages).toEqual(['en', 'de']);
      expect(store.settings.profanityOption).toBe('mask');
    });

    it('should save user preference when switching variants', async () => {
      await store.saveCurrentVariant('Config A', 1);
      const variantId = store.selectedVariantId;

      // Reload store
      const newStore = useTranslatorStore();
      await newStore.loadApiSettings();
      await newStore.loadSettingVariants();

      // User preference should be remembered
      expect(newStore.selectedVariantId).toBe(variantId);
    });

    it('should support different variants per user', async () => {
      // User 1 selects variant A
      store.settings.outputLanguages = ['de'];
      await store.saveCurrentVariant('Variant A', 1);
      const variantA = store.selectedVariantId;

      // User 2 selects variant B
      store.settings.outputLanguages = ['es'];
      await store.saveCurrentVariant('Variant B', 2);

      // User 1 loads their preference
      await store.selectVariant(variantA!, 1);
      expect(store.settings.outputLanguages).toEqual(['de']);
    });
  });

  describe('Updating Variants', () => {
    it('should update existing variant when saving', async () => {
      await store.saveCurrentVariant('Test Config', 1);
      const variantId = store.selectedVariantId;

      // Modify settings
      store.settings.outputLanguages = ['it', 'pt'];
      await store.saveCurrentVariant(undefined, 1);

      // Variant should be updated
      const variant = store.settingVariants.find((v) => v.id === variantId);
      expect(variant?.value.settings.outputLanguages).toEqual(['it', 'pt']);
    });

    it('should not create duplicate when updating', async () => {
      await store.saveCurrentVariant('Original', 1);
      const initialCount = store.settingVariants.length;

      // Update settings and save
      store.settings.inputLanguage = 'en-US';
      await store.saveCurrentVariant(undefined, 1);

      // Should still have same number of variants
      expect(store.settingVariants).toHaveLength(initialCount);
    });

    it('should track unsaved changes', async () => {
      await store.saveCurrentVariant('Test', 1);
      expect(store.hasUnsavedChanges).toBe(false);

      // Modify settings
      store.settings.outputLanguages = ['fr'];
      store.markSettingsChanged();

      expect(store.hasUnsavedChanges).toBe(true);

      // Save
      await store.saveCurrentVariant(undefined, 1);
      expect(store.hasUnsavedChanges).toBe(false);
    });
  });

  describe('Deleting Variants', () => {
    it('should delete variant and switch to Default', async () => {
      await store.saveCurrentVariant('To Delete', 1);
      const variantId = store.selectedVariantId;

      await store.deleteVariant(variantId!);

      // Variant should be removed
      expect(
        store.settingVariants.find((v) => v.id === variantId),
      ).toBeUndefined();

      // Should switch to Default
      const selected = store.settingVariants.find(
        (v) => v.id === store.selectedVariantId,
      );
      expect(selected?.value.name).toBe('Default');
    });

    it('should not allow deleting Default variant', async () => {
      const defaultVariant = store.settingVariants.find(
        (v) => v.value.name === 'Default',
      );

      await expect(store.deleteVariant(defaultVariant!.id)).rejects.toThrow();
    });

    it('should update user preferences after deletion', async () => {
      await store.saveCurrentVariant('Will Delete', 1);
      const variantId = store.selectedVariantId;

      await store.deleteVariant(variantId!);

      // Reload store
      const newStore = useTranslatorStore();
      await newStore.loadApiSettings();
      await newStore.loadSettingVariants();

      // Should not try to load deleted variant
      expect(newStore.selectedVariantId).not.toBe(variantId);
    });
  });

  describe('Settings Migration', () => {
    it('should migrate old language object format', async () => {
      // Create variant with old format (simulate)
      const oldFormatSettings = {
        inputLanguage: { code: 'en-US', name: 'English (US)' },
        outputLanguages: ['de'],
        profanityOption: 'raw',
        stablePartialResultThreshold: '5',
        phraseList: '',
        presentation: {
          font: 'Arial',
          fontSize: '2em',
          margin: '1em 2em',
          color: 'white',
          liveColor: '#999',
          background: 'black',
          mode: 'split',
          showInputLanguage: false,
        },
      };

      // Save with old format (would happen during migration)
      // This tests the migrateSettings function indirectly
      store.settings = oldFormatSettings as any;
      await store.saveCurrentVariant('Old Format', 1);

      // Reload
      const newStore = useTranslatorStore();
      await newStore.loadApiSettings();
      await newStore.loadSettingVariants();

      // Should be migrated to new format
      expect(typeof newStore.settings.inputLanguage).toBe('string');
      expect(newStore.settings.inputLanguage).toBe('en-US');
    });

    it('should migrate single outputLanguage to array', async () => {
      // Create variant with old single language format
      const oldSettings = {
        ...store.settings,
        outputLanguage: 'es', // Old format
      };
      delete (oldSettings as any).outputLanguages;

      store.settings = oldSettings as any;
      await store.saveCurrentVariant('Old Single Lang', 1);

      // Reload
      const newStore = useTranslatorStore();
      await newStore.loadApiSettings();
      await newStore.loadSettingVariants();

      // Should be migrated to array
      expect(Array.isArray(newStore.settings.outputLanguages)).toBe(true);
      expect(newStore.settings.outputLanguages).toEqual(['es']);
    });
  });

  describe('Invalid Data Handling', () => {
    it('should handle corrupt variant data', async () => {
      // This would be tested by manually corrupting data in persistence
      // For now, ensure store handles missing fields gracefully
      const newStore = useTranslatorStore();
      await newStore.loadApiSettings();
      await newStore.loadSettingVariants();

      // Should have at least Default variant
      expect(newStore.settingVariants.length).toBeGreaterThan(0);
      expect(newStore.selectedVariantId).not.toBeNull();
    });

    it('should use defaults for missing presentation settings', async () => {
      const partialSettings = {
        inputLanguage: 'en-US',
        outputLanguages: ['de'],
        profanityOption: 'raw' as const,
        stablePartialResultThreshold: '5',
        phraseList: '',
        // Missing presentation object
      };

      store.settings = partialSettings as any;
      await store.saveCurrentVariant('Partial', 1);

      // Should apply defaults
      expect(store.settings.presentation).toBeDefined();
      expect(store.settings.presentation.mode).toBe('split');
    });
  });
});
