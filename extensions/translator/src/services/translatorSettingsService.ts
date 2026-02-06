import type { CategoryValue } from '@churchtools-extensions/persistance';
import type {
  ApiSettings,
  OperatorSecret,
  ReaderConfig,
  SettingVariant,
} from '../types/translator';
import type { UserPreferences } from './translatorVariantService';
import {
  ensureTranslatorPersistance,
  getApiSettingsCategory,
  getOperatorSecretCategory,
  getReaderConfigCategory,
  getSettingsCategory,
  getUserPreferencesCategory,
} from './translatorPersistance';

export class TranslatorSettingsService {
  async ensureCategories(): Promise<void> {
    await ensureTranslatorPersistance();
  }

  async loadApiSettings(): Promise<ApiSettings> {
    await this.ensureCategories();
    const apiSettingsCategory = await getApiSettingsCategory();
    if (!apiSettingsCategory) {
      return { azureApiKey: '', azureRegion: '' };
    }

    const list = await apiSettingsCategory.list<ApiSettings>();
    if (list.length > 0) {
      return { ...list[0].value };
    }

    return { azureApiKey: '', azureRegion: '' };
  }

  async saveApiSettings(newApiSettings: ApiSettings): Promise<void> {
    await this.ensureCategories();
    const apiSettingsCategory = await getApiSettingsCategory();
    if (!apiSettingsCategory) return;

    const list = await apiSettingsCategory.list<ApiSettings>();

    if (list.length > 0) {
      await apiSettingsCategory.update(list[0].id, newApiSettings);
    } else {
      await apiSettingsCategory.create(newApiSettings);
    }
  }

  async loadOperatorSecret(): Promise<OperatorSecret> {
    await this.ensureCategories();
    const operatorSecretCategory = await getOperatorSecretCategory();
    if (!operatorSecretCategory) {
      return { secret: '' };
    }

    const list = await operatorSecretCategory.list<OperatorSecret>();
    if (list.length > 0) {
      return { ...list[0].value };
    }

    return { secret: '' };
  }

  async saveOperatorSecret(newOperatorSecret: OperatorSecret): Promise<void> {
    await this.ensureCategories();
    const operatorSecretCategory = await getOperatorSecretCategory();
    if (!operatorSecretCategory) return;

    const list = await operatorSecretCategory.list<OperatorSecret>();

    if (list.length > 0) {
      await operatorSecretCategory.update(list[0].id, newOperatorSecret);
    } else {
      await operatorSecretCategory.create(newOperatorSecret);
    }
  }

  async loadReaderConfig(): Promise<ReaderConfig> {
    await this.ensureCategories();
    const readerConfigCategory = await getReaderConfigCategory();
    if (!readerConfigCategory) {
      return {
        enabled: false,
        authFunctionUrl: '',
        readerSecret: '',
      };
    }

    const list = await readerConfigCategory.list<ReaderConfig>();
    if (list.length > 0) {
      return {
        enabled: list[0].value.enabled ?? false,
        authFunctionUrl: list[0].value.authFunctionUrl || '',
        readerSecret: list[0].value.readerSecret || '',
      };
    }

    return {
      enabled: false,
      authFunctionUrl: '',
      readerSecret: '',
    };
  }

  async saveReaderConfig(newReaderConfig: ReaderConfig): Promise<void> {
    await this.ensureCategories();
    const readerConfigCategory = await getReaderConfigCategory();
    if (!readerConfigCategory) return;

    const list = await readerConfigCategory.list<ReaderConfig>();

    if (list.length > 0) {
      await readerConfigCategory.update(list[0].id, newReaderConfig);
    } else {
      await readerConfigCategory.create(newReaderConfig);
    }
  }

  async listSettingVariants(): Promise<CategoryValue<SettingVariant>[]> {
    await this.ensureCategories();
    const settingsCategory = await getSettingsCategory();
    if (!settingsCategory) return [];

    return settingsCategory.list<SettingVariant>();
  }

  async createSettingVariant(variant: SettingVariant): Promise<number> {
    await this.ensureCategories();
    const settingsCategory = await getSettingsCategory();
    if (!settingsCategory) return -1;

    const { id } = await settingsCategory.create(variant);
    return id;
  }

  async updateSettingVariant(
    id: number,
    variant: SettingVariant,
  ): Promise<void> {
    await this.ensureCategories();
    const settingsCategory = await getSettingsCategory();
    if (!settingsCategory) return;

    await settingsCategory.update(id, variant);
  }

  async deleteSettingVariant(id: number): Promise<void> {
    await this.ensureCategories();
    const settingsCategory = await getSettingsCategory();
    if (!settingsCategory) return;

    await settingsCategory.delete(id);
  }

  async loadUserPreferences(): Promise<{
    id: number | null;
    value: UserPreferences;
  }> {
    await this.ensureCategories();
    const userPreferencesCategory = await getUserPreferencesCategory();
    if (!userPreferencesCategory) {
      return { id: null, value: {} };
    }

    const prefs = await userPreferencesCategory.list<UserPreferences>();
    if (prefs.length > 0) {
      return { id: prefs[0].id, value: { ...prefs[0].value } };
    }

    return { id: null, value: {} };
  }

  async saveUserPreferences(
    prefs: UserPreferences,
    recordId?: number | null,
  ): Promise<void> {
    await this.ensureCategories();
    const userPreferencesCategory = await getUserPreferencesCategory();
    if (!userPreferencesCategory) return;

    if (recordId) {
      await userPreferencesCategory.update(recordId, prefs);
      return;
    }

    const existing = await userPreferencesCategory.list<UserPreferences>();
    if (existing.length > 0) {
      await userPreferencesCategory.update(existing[0].id, prefs);
    } else {
      await userPreferencesCategory.create(prefs);
    }
  }

  async saveUserPreference(variantId: number, userId: number): Promise<void> {
    const { id, value } = await this.loadUserPreferences();
    const updated: UserPreferences = {
      ...value,
      [userId.toString()]: { lastVariantId: variantId },
    };
    await this.saveUserPreferences(updated, id);
  }
}
