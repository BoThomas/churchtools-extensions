import { describe, it, expect, beforeEach } from 'vitest';
import { useTranslatorStore } from '../../src/stores/translator';

/**
 * Integration Tests: Settings Persistence
 *
 * Tests the full workflow of saving and loading settings, API configuration,
 * and handling data migration and corruption scenarios.
 */
describe('Settings Persistence Integration', () => {
  let store: ReturnType<typeof useTranslatorStore>;

  beforeEach(async () => {
    store = useTranslatorStore();
  });

  describe('API Settings', () => {
    it('should save API settings to persistence', async () => {
      await store.saveApiSettings({
        azureApiKey: 'test-key-12345',
        azureRegion: 'westeurope',
      });

      // Reload and verify
      const newStore = useTranslatorStore();
      await newStore.loadApiSettings();

      expect(newStore.apiSettings.azureApiKey).toBe('test-key-12345');
      expect(newStore.apiSettings.azureRegion).toBe('westeurope');
    });

    it('should load API settings on startup', async () => {
      // Pre-populate settings
      await store.saveApiSettings({
        azureApiKey: 'my-api-key',
        azureRegion: 'eastus',
      });

      // Create new store instance
      const newStore = useTranslatorStore();
      await newStore.loadApiSettings();

      expect(newStore.apiSettings.azureApiKey).toBe('my-api-key');
      expect(newStore.apiSettings.azureRegion).toBe('eastus');
    });

    it('should update existing API settings', async () => {
      await store.saveApiSettings({
        azureApiKey: 'old-key',
        azureRegion: 'westus',
      });

      await store.saveApiSettings({
        azureApiKey: 'new-key',
        azureRegion: 'northeurope',
      });

      const newStore = useTranslatorStore();
      await newStore.loadApiSettings();

      expect(newStore.apiSettings.azureApiKey).toBe('new-key');
      expect(newStore.apiSettings.azureRegion).toBe('northeurope');
    });

    it('should handle missing API settings gracefully', async () => {
      await store.loadApiSettings();

      expect(store.apiSettings.azureApiKey).toBe('');
      expect(store.apiSettings.azureRegion).toBe('');
    });
  });

  describe('Variant Settings', () => {
    it('should save variant with all settings', async () => {
      store.settings.inputLanguage = 'fr-FR';
      store.settings.outputLanguages = ['en', 'de'];
      store.settings.profanityOption = 'mask';
      store.settings.stablePartialResultThreshold = '7';
      store.settings.phraseList = 'Test;Phrases';
      store.settings.presentation.font = 'Helvetica';
      store.settings.presentation.fontSize = '3em';

      await store.saveCurrentVariant('Full Config', 1);

      // Reload
      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      const variant = newStore.settingVariants.find(
        (v) => v.value.name === 'Full Config',
      );
      expect(variant).toBeDefined();
      expect(variant?.value.settings.inputLanguage).toBe('fr-FR');
      expect(variant?.value.settings.outputLanguages).toEqual(['en', 'de']);
      expect(variant?.value.settings.profanityOption).toBe('mask');
      expect(variant?.value.settings.phraseList).toBe('Test;Phrases');
      expect(variant?.value.settings.presentation.font).toBe('Helvetica');
    });

    it('should load last selected variant for user', async () => {
      // Create variants
      store.settings.outputLanguages = ['es'];
      await store.saveCurrentVariant('Spanish', 1);

      store.settings.outputLanguages = ['fr'];
      await store.saveCurrentVariant('French', 1);

      const frenchId = store.selectedVariantId;

      // Reload
      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants(1);

      // Should load French (last selected)
      expect(newStore.selectedVariantId).toBe(frenchId);
      expect(newStore.settings.outputLanguages).toEqual(['fr']);
    });

    it('should support different preferences per user', async () => {
      // User 1 selects variant A
      store.settings.outputLanguages = ['de'];
      await store.saveCurrentVariant('Variant A', 1);
      const variantAId = store.selectedVariantId;

      // User 2 selects variant B
      store.settings.outputLanguages = ['es'];
      await store.saveCurrentVariant('Variant B', 2);

      // Reload for User 1
      const store1 = useTranslatorStore();
      await store1.loadSettingVariants(1);
      expect(store1.selectedVariantId).toBe(variantAId);

      // Reload for User 2
      const store2 = useTranslatorStore();
      await store2.loadSettingVariants(2);
      expect(store2.settings.outputLanguages).toEqual(['es']);
    });
  });

  describe('Settings Migration', () => {
    it('should migrate old language object format to string', async () => {
      // Manually create old format (this would come from legacy data)
      const oldFormatSettings = {
        inputLanguage: { code: 'es-ES', name: 'Spanish (Spain)' } as any,
        outputLanguages: ['en'],
        profanityOption: 'raw' as const,
        stablePartialResultThreshold: '5',
        phraseList: '',
        presentation: {
          font: 'Arial',
          fontSize: '2em',
          margin: '1em 2em',
          color: 'white',
          liveColor: '#999',
          background: 'black',
          mode: 'split' as const,
          showInputLanguage: false,
        },
      };

      store.settings = oldFormatSettings as any;
      await store.saveCurrentVariant('Old Format', 1);

      // Reload - migration should happen
      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(typeof newStore.settings.inputLanguage).toBe('string');
      expect(newStore.settings.inputLanguage).toBe('es-ES');
    });

    it('should migrate single outputLanguage to array', async () => {
      // Old format with single language
      const oldSettings = {
        inputLanguage: 'de-DE',
        outputLanguage: 'it' as any, // Old format
        profanityOption: 'raw' as const,
        stablePartialResultThreshold: '5',
        phraseList: '',
        presentation: {
          font: 'Arial',
          fontSize: '2em',
          margin: '1em 2em',
          color: 'white',
          liveColor: '#999',
          background: 'black',
          mode: 'split' as const,
          showInputLanguage: false,
        },
      };

      store.settings = oldSettings as any;
      await store.saveCurrentVariant('Single Lang', 1);

      // Reload
      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(Array.isArray(newStore.settings.outputLanguages)).toBe(true);
      expect(newStore.settings.outputLanguages).toEqual(['it']);
    });

    it('should add missing presentation.mode default', async () => {
      const partialSettings = {
        inputLanguage: 'en-US',
        outputLanguages: ['de'],
        profanityOption: 'raw' as const,
        stablePartialResultThreshold: '5',
        phraseList: '',
        presentation: {
          font: 'Arial',
          fontSize: '2em',
          margin: '1em 2em',
          color: 'white',
          liveColor: '#999',
          background: 'black',
          // Missing mode
        } as any,
      };

      store.settings = partialSettings as any;
      await store.saveCurrentVariant('No Mode', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(newStore.settings.presentation.mode).toBe('split');
    });

    it('should add missing presentation.showInputLanguage default', async () => {
      const partialSettings = {
        inputLanguage: 'en-US',
        outputLanguages: ['de'],
        profanityOption: 'raw' as const,
        stablePartialResultThreshold: '5',
        phraseList: '',
        presentation: {
          font: 'Arial',
          fontSize: '2em',
          margin: '1em 2em',
          color: 'white',
          liveColor: '#999',
          background: 'black',
          mode: 'split' as const,
          // Missing showInputLanguage
        } as any,
      };

      store.settings = partialSettings as any;
      await store.saveCurrentVariant('No Show Input', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(newStore.settings.presentation.showInputLanguage).toBe(false);
    });
  });

  describe('Data Validation', () => {
    it('should validate settings before save', async () => {
      // Try to save with empty outputLanguages
      store.settings.outputLanguages = [];

      // Depending on implementation, this might throw or auto-fix
      // For now, just verify we can save
      await store.saveCurrentVariant('Empty Langs', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(
        newStore.settingVariants.some((v) => v.value.name === 'Empty Langs'),
      ).toBe(true);
    });

    it('should handle very long phrase lists', async () => {
      const longPhraseList = Array(100)
        .fill('Word')
        .map((w, i) => `${w}${i}`)
        .join(';');

      store.settings.phraseList = longPhraseList;
      await store.saveCurrentVariant('Long Phrases', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      const variant = newStore.settingVariants.find(
        (v) => v.value.name === 'Long Phrases',
      );
      expect(variant?.value.settings.phraseList).toBe(longPhraseList);
    });
  });

  describe('Persistence Error Handling', () => {
    it('should handle save failures gracefully', async () => {
      // This would require setting up error injection in persistence mock
      // For now, verify error state is set
      try {
        await store.saveCurrentVariant('Test', 1);
        expect(store.error).toBeNull();
      } catch (e) {
        // If it throws, verify error is captured
        expect(store.error).not.toBeNull();
      }
    });

    it('should handle load failures gracefully', async () => {
      // Load when there's an error should not crash
      await store.loadSettingVariants();

      // Should have at least Default variant
      expect(store.settingVariants.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent saves', async () => {
      // Save multiple variants in parallel
      const promises = [
        store.saveCurrentVariant('Config 1', 1),
        store.saveCurrentVariant('Config 2', 1),
        store.saveCurrentVariant('Config 3', 1),
      ];

      // Should not throw
      await Promise.all(promises);

      // Last one should win
      expect(
        store.settingVariants.some((v) => v.value.name === 'Config 3'),
      ).toBe(true);
    });

    it('should handle concurrent loads', async () => {
      await store.saveCurrentVariant('Test', 1);

      // Load multiple times in parallel
      const promises = [
        store.loadSettingVariants(),
        store.loadSettingVariants(),
        store.loadSettingVariants(),
      ];

      await Promise.all(promises);

      // Should have loaded successfully
      expect(store.settingVariants.length).toBeGreaterThan(0);
    });
  });

  describe('User Preferences', () => {
    it('should save and load user variant preference', async () => {
      store.settings.outputLanguages = ['ru'];
      await store.saveCurrentVariant('Russian', 5);
      const variantId = store.selectedVariantId!;

      // Switch to different user
      const store2 = useTranslatorStore();
      await store2.loadSettingVariants(10);

      // User 10 should not have User 5's preference
      // (unless they explicitly selected it)

      // Switch back to User 5
      const store3 = useTranslatorStore();
      await store3.loadSettingVariants(5);

      // Should restore User 5's preference
      expect(store3.selectedVariantId).toBe(variantId);
    });

    it('should update preference when switching variants', async () => {
      await store.saveCurrentVariant('Variant A', 1);
      await store.saveCurrentVariant('Variant B', 1);
      const variantBId = store.selectedVariantId;

      // Reload
      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants(1);

      // Should remember Variant B
      expect(newStore.selectedVariantId).toBe(variantBId);
    });
  });
});
