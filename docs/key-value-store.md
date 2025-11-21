# Key-Value Store Guide

ChurchTools extensions can store persistent data using the ChurchTools key-value store. This guide explains how to use the storage utilities provided in `@churchtools-extensions/ct-utils/kv-store`.

## Overview

The key-value store allows extensions to persist data in ChurchTools, such as:

- User settings and preferences
- Configuration data
- Application state
- Cached data

The storage is organized hierarchically:

```
Extension Module (identified by extension key)
└── Data Categories (organize related data)
    └── Data Values (actual key-value pairs)
```

## Key Concepts

### Module

Each extension has a **module** identified by the extension key (e.g., `my-extension`). The module is automatically registered when you install the extension in ChurchTools.

In **development mode**, the module can be automatically created using `getOrCreateModule()`.

### Data Categories

**Categories** organize related data within a module. For example:

- `settings` - User preferences and configuration
- `cache` - Cached API responses
- `user-data` - User-specific data

### Data Values

**Values** are the actual key-value pairs stored within a category. Each value is a JSON string that can store any serializable data.

## Best Practices

### Always Pass the Extension Key from Your Extension

Since the kv-store package is environment-agnostic, **always get the extension key from your extension code**:

```typescript
// In your extension's main file (e.g., main.ts, App.vue)
const KEY = import.meta.env.VITE_KEY;

// Pass it to kv-store functions
const module = await getModule(KEY);
const categories = await getCustomDataCategories(undefined, KEY);
```

### Use Module ID When Available

If you've already fetched the module, prefer passing `moduleId` over `extensionkey` to avoid redundant API calls:

```typescript
// Fetch module once
const module = await getModule(KEY);

// Use moduleId for subsequent calls
const categories = await getCustomDataCategories(module.id);
const values = await getCustomDataValues(categoryId, module.id);
```

### Use the Persistance Package for Higher-Level API

For a more convenient class-based API, use the `@churchtools-extensions/persistance` package:

```typescript
import { PersistanceCategory } from '@churchtools-extensions/persistance';

const KEY = import.meta.env.VITE_KEY;
const store = await PersistanceCategory.init({
  extensionkey: KEY, // Required - must be passed from extension
  categoryShorty: 'settings',
  categoryName: 'Settings',
});

// Now use the simpler API
const values = await store.list();
await store.create({ key: 'theme', value: 'dark' });
```

## Usage Patterns

### Pattern 1: Simple Settings Storage

```typescript
import {
  getOrCreateModule,
  getCustomDataCategory,
  createCustomDataCategory,
  getCustomDataValues,
  createCustomDataValue,
  updateCustomDataValue,
} from '../utils/kv-store';

interface Setting {
  key: string;
  value: string;
}

// Initialize
const module = await getOrCreateModule(KEY, 'My Extension', 'Description');

// Get or create settings category
let category = await getCustomDataCategory<object>('settings');
if (!category) {
  await createCustomDataCategory(
    {
      customModuleId: module.id,
      name: 'Settings',
      shorty: 'settings',
      description: 'Extension settings',
    },
    module.id,
  );
  category = await getCustomDataCategory<object>('settings');
}

// Load settings
const values = await getCustomDataValues<Setting>(category.id, module.id);
const theme = values.find((v) => v.key === 'theme');

// Save setting
if (theme) {
  await updateCustomDataValue(
    category.id,
    theme.id,
    {
      value: JSON.stringify({ key: 'theme', value: 'dark' }),
    },
    module.id,
  );
} else {
  await createCustomDataValue(
    {
      dataCategoryId: category.id,
      value: JSON.stringify({ key: 'theme', value: 'dark' }),
    },
    module.id,
  );
}
```

### Pattern 2: Type-Safe Settings

```typescript
interface ExtensionSettings {
  backgroundColor: string;
  fontSize: number;
  enabled: boolean;
}

interface SettingValue {
  key: keyof ExtensionSettings;
  value: string | number | boolean;
}

async function loadSettings(): Promise<ExtensionSettings> {
  const module = await getModule();
  const category = await getCustomDataCategory<object>('settings');

  if (!category) {
    return {
      backgroundColor: '#ffffff',
      fontSize: 14,
      enabled: true,
    };
  }

  const values = await getCustomDataValues<SettingValue>(
    category.id,
    module.id,
  );

  const settings: ExtensionSettings = {
    backgroundColor: '#ffffff',
    fontSize: 14,
    enabled: true,
  };

  values.forEach((v) => {
    settings[v.key] = v.value;
  });

  return settings;
}

async function saveSetting<K extends keyof ExtensionSettings>(
  key: K,
  value: ExtensionSettings[K],
): Promise<void> {
  const module = await getModule();
  const category = await getCustomDataCategory<object>('settings');

  if (!category) {
    throw new Error('Settings category not found');
  }

  const values = await getCustomDataValues<SettingValue>(
    category.id,
    module.id,
  );
  const existing = values.find((v) => v.key === key);

  const valueData = JSON.stringify({ key, value });

  if (existing) {
    await updateCustomDataValue(
      category.id,
      existing.id,
      {
        value: valueData,
      },
      module.id,
    );
  } else {
    await createCustomDataValue(
      {
        dataCategoryId: category.id,
        value: valueData,
      },
      module.id,
    );
  }
}
```

### Pattern 3: Caching Data

```typescript
interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl: number; // Time to live in seconds
}

async function getCachedData<T>(key: string): Promise<T | null> {
  const module = await getModule();
  const category = await getCustomDataCategory<object>('cache');

  if (!category) return null;

  const values = await getCustomDataValues<CacheEntry>(category.id, module.id);
  const entry = values.find((v) => v.key === key);

  if (!entry) return null;

  // Check if expired
  const now = Date.now();
  if (now - entry.timestamp > entry.ttl * 1000) {
    // Expired, delete it
    await deleteCustomDataValue(category.id, entry.id, module.id);
    return null;
  }

  return entry.value as T;
}

async function setCachedData<T>(
  key: string,
  value: T,
  ttl: number = 3600,
): Promise<void> {
  const module = await getModule();
  let category = await getCustomDataCategory<object>('cache');

  if (!category) {
    await createCustomDataCategory(
      {
        customModuleId: module.id,
        name: 'Cache',
        shorty: 'cache',
        description: 'Cached data',
      },
      module.id,
    );
    category = await getCustomDataCategory<object>('cache');
  }

  const values = await getCustomDataValues<CacheEntry>(category!.id, module.id);
  const existing = values.find((v) => v.key === key);

  const cacheEntry: CacheEntry = {
    key,
    value,
    timestamp: Date.now(),
    ttl,
  };

  const valueData = JSON.stringify(cacheEntry);

  if (existing) {
    await updateCustomDataValue(
      category!.id,
      existing.id,
      {
        value: valueData,
      },
      module.id,
    );
  } else {
    await createCustomDataValue(
      {
        dataCategoryId: category!.id,
        value: valueData,
      },
      module.id,
    );
  }
}
```

## Best Practices

### 1. Use Type-Safe Interfaces

Define interfaces for your stored data:

```typescript
interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

const prefs = await getCustomDataValues<UserPreferences>(categoryId);
```

### 2. Handle Missing Data Gracefully

Always provide fallback values:

```typescript
let backgroundColor = '#ffffff'; // Default

try {
  const values = await getCustomDataValues<Setting>(categoryId);
  const bgSetting = values.find((v) => v.key === 'backgroundColor');
  if (bgSetting) {
    backgroundColor = bgSetting.value;
  }
} catch (error) {
  console.log('Using default background color');
}
```

### 3. Use Descriptive Category Names

```typescript
// Good
'settings';
'user-preferences';
'cache';
'sync-status';

// Bad
'data';
'stuff';
'misc';
```

### 4. Keep Values Small

Store only necessary data. Large objects should be split into multiple values:

```typescript
// Good: Split large data
await createCustomDataValue({
  dataCategoryId: categoryId,
  value: JSON.stringify({ key: 'profile', value: userProfile }),
});
await createCustomDataValue({
  dataCategoryId: categoryId,
  value: JSON.stringify({ key: 'preferences', value: userPrefs }),
});

// Bad: One huge value
await createCustomDataValue({
  dataCategoryId: categoryId,
  value: JSON.stringify({ allUserData: hugeObject }),
});
```

### 5. Clean Up Old Data

Implement cleanup for expired or unused data:

```typescript
async function cleanupExpiredCache(): Promise<void> {
  const module = await getModule();
  const category = await getCustomDataCategory<object>('cache');

  if (!category) return;

  const values = await getCustomDataValues<CacheEntry>(category.id, module.id);
  const now = Date.now();

  for (const entry of values) {
    if (now - entry.timestamp > entry.ttl * 1000) {
      await deleteCustomDataValue(category.id, entry.id, module.id);
    }
  }
}
```

## Error Handling

Always wrap KV store operations in try-catch:

```typescript
async function loadSettings() {
  try {
    const module = await getModule();
    const category = await getCustomDataCategory<object>('settings');

    if (!category) {
      return defaultSettings;
    }

    const values = await getCustomDataValues<Setting>(category.id, module.id);
    return parseSettings(values);
  } catch (error) {
    console.error('Failed to load settings:', error);
    return defaultSettings;
  }
}
```

## Development vs Production

### Development Mode

In development, use `getOrCreateModule()` to automatically create the module:

```typescript
const module = await getOrCreateModule(
  KEY,
  'My Extension',
  'Extension description',
);
```

### Production Mode

In production, the module is created when the extension is installed. Use `getModule()`:

```typescript
const module = await getModule(KEY);
```
