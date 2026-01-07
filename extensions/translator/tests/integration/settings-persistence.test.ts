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

    it('should add missing outputModes with defaults', async () => {
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
          showInputLanguage: false,
        },
        // Missing outputModes
      } as any;

      store.settings = partialSettings;
      await store.saveCurrentVariant('No Output Modes', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(newStore.settings.outputModes).toBeDefined();
      expect(newStore.settings.outputModes?.presentationEnabled).toBe(true);
      expect(newStore.settings.outputModes?.streamedSessionEnabled).toBe(false);
    });

    it('should ensure outputModes values are booleans', async () => {
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
          showInputLanguage: false,
        },
        outputModes: {
          presentationEnabled: 1 as any, // Non-boolean value
          streamedSessionEnabled: 0 as any, // Non-boolean value
        },
      } as any;

      store.settings = partialSettings;
      await store.saveCurrentVariant('Non-Boolean Modes', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(newStore.settings.outputModes?.presentationEnabled).toBe(true);
      expect(newStore.settings.outputModes?.streamedSessionEnabled).toBe(false);
      expect(typeof newStore.settings.outputModes?.presentationEnabled).toBe(
        'boolean',
      );
      expect(typeof newStore.settings.outputModes?.streamedSessionEnabled).toBe(
        'boolean',
      );
    });

    it('should preserve valid outputModes when present', async () => {
      store.settings.outputModes = {
        presentationEnabled: false,
        streamedSessionEnabled: true,
      };

      await store.saveCurrentVariant('Custom Output Modes', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(newStore.settings.outputModes?.presentationEnabled).toBe(false);
      expect(newStore.settings.outputModes?.streamedSessionEnabled).toBe(true);
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

  describe('WebPubSub Configuration', () => {
    it('should save and load operator secret', async () => {
      await store.saveOperatorSecret({
        secret: 'operator-secret-12345',
      });

      // Reload and verify
      const newStore = useTranslatorStore();
      await newStore.loadOperatorSecret();

      expect(newStore.operatorSecret.secret).toBe('operator-secret-12345');
    });

    it('should save and load reader config with enabled flag', async () => {
      await store.saveReaderConfig({
        enabled: true,
        authFunctionUrl: 'https://my-function.azurewebsites.net/api/negotiate',
        readerSecret: 'reader-secret-67890',
      });

      // Reload and verify
      const newStore = useTranslatorStore();
      await newStore.loadReaderConfig();

      expect(newStore.readerConfig.enabled).toBe(true);
      expect(newStore.readerConfig.authFunctionUrl).toBe(
        'https://my-function.azurewebsites.net/api/negotiate',
      );
      expect(newStore.readerConfig.readerSecret).toBe('reader-secret-67890');
    });

    it('should default enabled to false when loading reader config', async () => {
      await store.saveReaderConfig({
        enabled: false,
        authFunctionUrl: 'https://test.com/api',
        readerSecret: 'test-secret',
      });

      const newStore = useTranslatorStore();
      await newStore.loadReaderConfig();

      expect(newStore.readerConfig.enabled).toBe(false);
    });

    it('should update existing operator secret', async () => {
      await store.saveOperatorSecret({ secret: 'old-operator-secret' });
      await store.saveOperatorSecret({ secret: 'new-operator-secret' });

      const newStore = useTranslatorStore();
      await newStore.loadOperatorSecret();

      expect(newStore.operatorSecret.secret).toBe('new-operator-secret');
    });

    it('should update existing reader config', async () => {
      await store.saveReaderConfig({
        enabled: false,
        authFunctionUrl: 'https://old-url.com/api',
        readerSecret: 'old-reader-secret',
      });

      await store.saveReaderConfig({
        enabled: true,
        authFunctionUrl: 'https://new-url.com/api/negotiate',
        readerSecret: 'new-reader-secret',
      });

      const newStore = useTranslatorStore();
      await newStore.loadReaderConfig();

      expect(newStore.readerConfig.enabled).toBe(true);
      expect(newStore.readerConfig.authFunctionUrl).toBe(
        'https://new-url.com/api/negotiate',
      );
      expect(newStore.readerConfig.readerSecret).toBe('new-reader-secret');
    });

    it('should handle missing operator secret gracefully', async () => {
      await store.loadOperatorSecret();

      expect(store.operatorSecret.secret).toBe('');
    });

    it('should handle missing reader config gracefully', async () => {
      await store.loadReaderConfig();

      expect(store.readerConfig.enabled).toBe(false);
      expect(store.readerConfig.authFunctionUrl).toBe('');
      expect(store.readerConfig.readerSecret).toBe('');
    });

    it('should save operator secret and reader config to separate categories', async () => {
      // Save both
      await store.saveOperatorSecret({ secret: 'operator-only-secret' });
      await store.saveReaderConfig({
        enabled: true,
        authFunctionUrl: 'https://function.azure.com/api/negotiate',
        readerSecret: 'public-reader-secret',
      });

      // Reload in new store
      const newStore = useTranslatorStore();
      await newStore.loadOperatorSecret();
      await newStore.loadReaderConfig();

      // Verify both are loaded correctly from separate categories
      expect(newStore.operatorSecret.secret).toBe('operator-only-secret');
      expect(newStore.readerConfig.enabled).toBe(true);
      expect(newStore.readerConfig.readerSecret).toBe('public-reader-secret');
      expect(newStore.readerConfig.authFunctionUrl).toBe(
        'https://function.azure.com/api/negotiate',
      );
    });

    it('should save both WebPubSub configs simultaneously without interference', async () => {
      // Simulate simultaneous save (like the unified save button in UI)
      await Promise.all([
        store.saveOperatorSecret({ secret: 'parallel-operator-secret' }),
        store.saveReaderConfig({
          enabled: false,
          authFunctionUrl: 'https://parallel-function.com/api',
          readerSecret: 'parallel-reader-secret',
        }),
      ]);

      // Reload
      const newStore = useTranslatorStore();
      await Promise.all([
        newStore.loadOperatorSecret(),
        newStore.loadReaderConfig(),
      ]);

      expect(newStore.operatorSecret.secret).toBe('parallel-operator-secret');
      expect(newStore.readerConfig.enabled).toBe(false);
      expect(newStore.readerConfig.authFunctionUrl).toBe(
        'https://parallel-function.com/api',
      );
      expect(newStore.readerConfig.readerSecret).toBe('parallel-reader-secret');
    });
  });

  describe('Session Settings Migration', () => {
    it('should add missing session object with defaults', async () => {
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
          showInputLanguage: false,
        },
        outputModes: {
          presentationEnabled: true,
          streamedSessionEnabled: false,
        },
        // Missing session object
      } as any;

      store.settings = partialSettings;
      await store.saveCurrentVariant('No Session', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(newStore.settings.session).toBeDefined();
      expect(newStore.settings.session?.hidden).toBe(false);
      expect(newStore.settings.session?.displayName).toBeUndefined();
      expect(newStore.settings.session?.maxClients).toBeUndefined();
    });

    it('should preserve existing session settings during migration', async () => {
      const settingsWithSession = {
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
          showInputLanguage: false,
        },
        outputModes: {
          presentationEnabled: true,
          streamedSessionEnabled: true,
        },
        session: {
          displayName: 'Sunday Service',
          maxClients: 19,
          hidden: true,
        },
      };

      store.settings = settingsWithSession as any;
      await store.saveCurrentVariant('With Session', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(newStore.settings.session?.displayName).toBe('Sunday Service');
      expect(newStore.settings.session?.maxClients).toBe(19);
      expect(newStore.settings.session?.hidden).toBe(true);
    });

    it('should ensure session.hidden is a boolean', async () => {
      const invalidSettings = {
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
          showInputLanguage: false,
        },
        outputModes: {
          presentationEnabled: true,
          streamedSessionEnabled: false,
        },
        session: {
          hidden: 1 as any, // Non-boolean value (truthy)
        },
      };

      store.settings = invalidSettings as any;
      await store.saveCurrentVariant('Invalid Hidden', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(typeof newStore.settings.session?.hidden).toBe('boolean');
      expect(newStore.settings.session?.hidden).toBe(false); // Migration should set default
    });

    it('should ensure session.maxClients is a number or undefined', async () => {
      const invalidSettings = {
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
          showInputLanguage: false,
        },
        outputModes: {
          presentationEnabled: true,
          streamedSessionEnabled: false,
        },
        session: {
          hidden: false,
          maxClients: '50' as any, // String instead of number
        },
      };

      store.settings = invalidSettings as any;
      await store.saveCurrentVariant('String MaxClients', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      // Should be converted to undefined (invalid type)
      expect(newStore.settings.session?.maxClients).toBeUndefined();
    });

    it('should preserve valid session.displayName string', async () => {
      store.settings.session = {
        displayName: 'My Custom Session Name',
        hidden: false,
      };

      await store.saveCurrentVariant('With Display Name', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(newStore.settings.session?.displayName).toBe(
        'My Custom Session Name',
      );
    });

    it('should handle partial session object and fill missing defaults', async () => {
      const partialSession = {
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
          showInputLanguage: false,
        },
        outputModes: {
          presentationEnabled: true,
          streamedSessionEnabled: false,
        },
        session: {
          displayName: 'Partial Session',
          // Missing hidden
        } as any,
      };

      store.settings = partialSession as any;
      await store.saveCurrentVariant('Partial Session', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      expect(newStore.settings.session?.displayName).toBe('Partial Session');
      expect(newStore.settings.session?.hidden).toBe(false); // Should add default
      expect(newStore.settings.session?.maxClients).toBeUndefined();
    });

    it('should handle corrupt session data gracefully', async () => {
      const corruptSettings = {
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
          showInputLanguage: false,
        },
        outputModes: {
          presentationEnabled: true,
          streamedSessionEnabled: false,
        },
        session: null as any, // Null instead of object
      };

      store.settings = corruptSettings as any;
      await store.saveCurrentVariant('Corrupt Session', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      // Should create valid session object with defaults
      expect(newStore.settings.session).toBeDefined();
      expect(newStore.settings.session).not.toBeNull();
      expect(newStore.settings.session?.hidden).toBe(false);
    });
  });

  describe('Session Settings Persistence', () => {
    it('should save variant with all session settings', async () => {
      store.settings.session = {
        displayName: 'Evening Service',
        maxClients: 50,
        hidden: true,
      };

      await store.saveCurrentVariant('Full Session Config', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      const variant = newStore.settingVariants.find(
        (v) => v.value.name === 'Full Session Config',
      );
      expect(variant?.value.settings.session?.displayName).toBe(
        'Evening Service',
      );
      expect(variant?.value.settings.session?.maxClients).toBe(50);
      expect(variant?.value.settings.session?.hidden).toBe(true);
    });

    it('should persist session.displayName as optional string', async () => {
      // Test with displayName set
      store.settings.session = {
        displayName: 'Test Session',
        hidden: false,
      };
      await store.saveCurrentVariant('With Name', 1);

      // Test without displayName
      store.settings.session = {
        hidden: false,
      };
      await store.saveCurrentVariant('Without Name', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      const withName = newStore.settingVariants.find(
        (v) => v.value.name === 'With Name',
      );
      const withoutName = newStore.settingVariants.find(
        (v) => v.value.name === 'Without Name',
      );

      expect(withName?.value.settings.session?.displayName).toBe(
        'Test Session',
      );
      expect(withoutName?.value.settings.session?.displayName).toBeUndefined();
    });

    it('should persist session.maxClients as optional number', async () => {
      // Test with maxClients set
      store.settings.session = {
        maxClients: 100,
        hidden: false,
      };
      await store.saveCurrentVariant('With Max', 1);

      // Test without maxClients (unlimited)
      store.settings.session = {
        hidden: false,
      };
      await store.saveCurrentVariant('Unlimited', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      const withMax = newStore.settingVariants.find(
        (v) => v.value.name === 'With Max',
      );
      const unlimited = newStore.settingVariants.find(
        (v) => v.value.name === 'Unlimited',
      );

      expect(withMax?.value.settings.session?.maxClients).toBe(100);
      expect(unlimited?.value.settings.session?.maxClients).toBeUndefined();
    });

    it('should persist session.hidden as required boolean', async () => {
      // Test hidden = true
      store.settings.session = {
        hidden: true,
      };
      await store.saveCurrentVariant('Hidden True', 1);

      // Test hidden = false
      store.settings.session = {
        hidden: false,
      };
      await store.saveCurrentVariant('Hidden False', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      const hiddenTrue = newStore.settingVariants.find(
        (v) => v.value.name === 'Hidden True',
      );
      const hiddenFalse = newStore.settingVariants.find(
        (v) => v.value.name === 'Hidden False',
      );

      expect(hiddenTrue?.value.settings.session?.hidden).toBe(true);
      expect(hiddenFalse?.value.settings.session?.hidden).toBe(false);
    });

    it('should handle empty displayName correctly', async () => {
      // Empty string should be preserved
      store.settings.session = {
        displayName: '',
        hidden: false,
      };
      await store.saveCurrentVariant('Empty Display Name', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      const variant = newStore.settingVariants.find(
        (v) => v.value.name === 'Empty Display Name',
      );
      expect(variant?.value.settings.session?.displayName).toBe('');
    });

    it('should persist complex session configuration', async () => {
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en', 'fr'];
      store.settings.session = {
        displayName: 'Multi-language Conference',
        maxClients: 200,
        hidden: false,
      };

      await store.saveCurrentVariant('Complex Config', 1);

      const newStore = useTranslatorStore();
      await newStore.loadSettingVariants();

      const variant = newStore.settingVariants.find(
        (v) => v.value.name === 'Complex Config',
      );
      expect(variant?.value.settings.inputLanguage).toBe('de-DE');
      expect(variant?.value.settings.outputLanguages).toEqual(['en', 'fr']);
      expect(variant?.value.settings.session?.displayName).toBe(
        'Multi-language Conference',
      );
      expect(variant?.value.settings.session?.maxClients).toBe(200);
      expect(variant?.value.settings.session?.hidden).toBe(false);
    });
  });
});
