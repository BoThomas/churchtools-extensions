import {
  PersistanceCategory,
  type CategoryValue,
} from '@churchtools-extensions/persistance';
import { KEY } from '../config';
import type { TranslationSession } from './sessionLogger';
import type { StreamedSessionMetadata } from '../types/streamedSession';
import type {
  ApiSettings,
  OperatorSecret,
  ReaderConfig,
  SettingVariant,
} from '../types/translator';
import type { UserPreferences } from './translatorVariantService';

let sessionsCategory: PersistanceCategory<TranslationSession> | null = null;
let streamedSessionsCategory: PersistanceCategory<StreamedSessionMetadata> | null =
  null;
let apiSettingsCategory: PersistanceCategory<ApiSettings> | null = null;
let settingsCategory: PersistanceCategory<SettingVariant> | null = null;
let userPreferencesCategory: PersistanceCategory<UserPreferences> | null = null;
let operatorSecretCategory: PersistanceCategory<OperatorSecret> | null = null;
let readerConfigCategory: PersistanceCategory<ReaderConfig> | null = null;

let categoriesInitializing: Promise<void> | null = null;

export type TranslatorCategories = {
  sessionsCategory: PersistanceCategory<TranslationSession> | null;
  streamedSessionsCategory: PersistanceCategory<StreamedSessionMetadata> | null;
  apiSettingsCategory: PersistanceCategory<ApiSettings> | null;
  settingsCategory: PersistanceCategory<SettingVariant> | null;
  userPreferencesCategory: PersistanceCategory<UserPreferences> | null;
  operatorSecretCategory: PersistanceCategory<OperatorSecret> | null;
  readerConfigCategory: PersistanceCategory<ReaderConfig> | null;
};

export async function ensureTranslatorPersistance(): Promise<TranslatorCategories> {
  if (categoriesInitializing) {
    await categoriesInitializing;
    return {
      sessionsCategory,
      streamedSessionsCategory,
      apiSettingsCategory,
      settingsCategory,
      userPreferencesCategory,
      operatorSecretCategory,
      readerConfigCategory,
    };
  }

  if (
    sessionsCategory &&
    streamedSessionsCategory &&
    apiSettingsCategory &&
    settingsCategory &&
    userPreferencesCategory &&
    operatorSecretCategory &&
    readerConfigCategory
  ) {
    return {
      sessionsCategory,
      streamedSessionsCategory,
      apiSettingsCategory,
      settingsCategory,
      userPreferencesCategory,
      operatorSecretCategory,
      readerConfigCategory,
    };
  }

  categoriesInitializing = (async () => {
    if (!sessionsCategory) {
      sessionsCategory = await PersistanceCategory.init({
        extensionkey: KEY,
        categoryShorty: 'sessions',
        categoryName: 'Translation Sessions',
      });
    }
    if (!streamedSessionsCategory) {
      streamedSessionsCategory = await PersistanceCategory.init({
        extensionkey: KEY,
        categoryShorty: 'streamed-sessions',
        categoryName: 'Active Streamed Sessions',
      });
    }
    if (!apiSettingsCategory) {
      apiSettingsCategory = await PersistanceCategory.init({
        extensionkey: KEY,
        categoryShorty: 'api-settings',
        categoryName: 'API Configuration',
      });
    }
    if (!settingsCategory) {
      settingsCategory = await PersistanceCategory.init({
        extensionkey: KEY,
        categoryShorty: 'setting-variants',
        categoryName: 'Setting Variants',
      });
    }
    if (!userPreferencesCategory) {
      userPreferencesCategory = await PersistanceCategory.init({
        extensionkey: KEY,
        categoryShorty: 'user-prefs',
        categoryName: 'User Preferences',
      });
    }
    if (!operatorSecretCategory) {
      operatorSecretCategory = await PersistanceCategory.init({
        extensionkey: KEY,
        categoryShorty: 'operator-secret',
        categoryName: 'WebPubSub Operator Secret',
      });
    }
    if (!readerConfigCategory) {
      readerConfigCategory = await PersistanceCategory.init({
        extensionkey: KEY,
        categoryShorty: 'reader-config',
        categoryName: 'WebPubSub Reader Configuration',
      });
    }
  })();

  await categoriesInitializing;
  categoriesInitializing = null;

  return {
    sessionsCategory,
    streamedSessionsCategory,
    apiSettingsCategory,
    settingsCategory,
    userPreferencesCategory,
    operatorSecretCategory,
    readerConfigCategory,
  };
}

export async function getSessionsCategory(): Promise<PersistanceCategory<TranslationSession> | null> {
  const categories = await ensureTranslatorPersistance();
  return categories.sessionsCategory;
}

export async function getStreamedSessionsCategory(): Promise<PersistanceCategory<StreamedSessionMetadata> | null> {
  const categories = await ensureTranslatorPersistance();
  return categories.streamedSessionsCategory;
}

export async function getApiSettingsCategory(): Promise<PersistanceCategory<ApiSettings> | null> {
  const categories = await ensureTranslatorPersistance();
  return categories.apiSettingsCategory;
}

export async function getSettingsCategory(): Promise<PersistanceCategory<SettingVariant> | null> {
  const categories = await ensureTranslatorPersistance();
  return categories.settingsCategory;
}

export async function getUserPreferencesCategory(): Promise<PersistanceCategory<UserPreferences> | null> {
  const categories = await ensureTranslatorPersistance();
  return categories.userPreferencesCategory;
}

export async function getOperatorSecretCategory(): Promise<PersistanceCategory<OperatorSecret> | null> {
  const categories = await ensureTranslatorPersistance();
  return categories.operatorSecretCategory;
}

export async function getReaderConfigCategory(): Promise<PersistanceCategory<ReaderConfig> | null> {
  const categories = await ensureTranslatorPersistance();
  return categories.readerConfigCategory;
}

export function resetTranslatorPersistance(): void {
  sessionsCategory = null;
  streamedSessionsCategory = null;
  apiSettingsCategory = null;
  settingsCategory = null;
  userPreferencesCategory = null;
  operatorSecretCategory = null;
  readerConfigCategory = null;
  categoriesInitializing = null;
}

export type SessionCategoryValue = CategoryValue<TranslationSession>;
