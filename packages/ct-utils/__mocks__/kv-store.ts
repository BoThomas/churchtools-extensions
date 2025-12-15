/**
 * Mock implementation of kv-store for testing
 * This provides an in-memory storage that mimics the ChurchTools Custom Module KV store
 */
import type {
  CustomModule,
  CustomModuleDataCategory,
  CustomModuleDataCategoryCreate,
  CustomModuleDataValue,
  CustomModuleDataValueCreate,
} from '../ct-types';

// In-memory storage
const modules = new Map<string, CustomModule>();
const categories = new Map<number, CustomModuleDataCategory>();
const values = new Map<number, Map<number, CustomModuleDataValue>>();

let nextModuleId = 1;
let nextCategoryId = 1;
let nextValueId = 1;

/**
 * Reset all mock data - useful for test isolation
 */
export function _resetKVStore(): void {
  modules.clear();
  categories.clear();
  values.clear();
  nextModuleId = 1;
  nextCategoryId = 1;
  nextValueId = 1;
}

/**
 * Seed initial modules - useful for test setup
 */
export function _seedModules(moduleList: CustomModule[]): void {
  moduleList.forEach((module) => {
    modules.set(module.shorty, module);
    if (module.id >= nextModuleId) {
      nextModuleId = module.id + 1;
    }
  });
}

// ============================================================================
// Module Operations
// ============================================================================

export async function getModule(extensionkey: string): Promise<CustomModule> {
  const module = modules.get(extensionkey);
  if (!module) {
    throw new Error(`Module for extension key "${extensionkey}" not found.`);
  }
  return module;
}

export async function getOrCreateModule(
  extensionkey: string,
  name: string,
  description: string,
): Promise<CustomModule> {
  try {
    return await getModule(extensionkey);
  } catch {
    return await createModule(extensionkey, name, description);
  }
}

async function createModule(
  extensionkey: string,
  name: string,
  description: string,
): Promise<CustomModule> {
  const module: CustomModule = {
    id: nextModuleId++,
    name,
    shorty: extensionkey,
    description,
    sortKey: 100,
  };
  modules.set(extensionkey, module);
  return module;
}

// ============================================================================
// Category Operations
// ============================================================================

export async function getCustomDataCategories<T extends object>(
  moduleId?: number,
  extensionkey?: string,
): Promise<(T & Omit<CustomModuleDataCategory, 'data'>)[]> {
  const resolvedModuleId = await resolveModuleId(moduleId, extensionkey);

  const moduleCategories = Array.from(categories.values()).filter(
    (cat) => cat.customModuleId === resolvedModuleId,
  );

  return moduleCategories.map((category) => {
    const { data, ...rest } = category;
    let parsedData: T = {} as T;
    if (data) {
      try {
        parsedData = JSON.parse(data) as T;
      } catch {
        // ignore parse errors
      }
    }
    return {
      ...rest,
      ...parsedData,
    };
  });
}

export async function getCustomDataCategory<T extends object>(
  shorty: string,
  moduleId?: number,
  extensionkey?: string,
): Promise<CustomModuleDataCategory | undefined> {
  const cats = await getCustomDataCategories<T>(moduleId, extensionkey);
  return cats.find((category) => category.shorty === shorty);
}

export async function createCustomDataCategory(
  payload: CustomModuleDataCategoryCreate,
  moduleId?: number,
  extensionkey?: string,
): Promise<CustomModuleDataCategory> {
  const resolvedModuleId = await resolveModuleId(moduleId, extensionkey);

  const newCategory: CustomModuleDataCategory = {
    id: nextCategoryId++,
    customModuleId: resolvedModuleId,
    name: payload.name,
    shorty: payload.shorty,
    description: payload.description || '',
    data: undefined,
  };

  categories.set(newCategory.id, newCategory);
  values.set(newCategory.id, new Map());

  return newCategory;
}

export async function updateCustomDataCategory(
  dataCategoryId: number,
  payload: Partial<CustomModuleDataCategory>,
  _moduleId?: number,
  _extensionkey?: string,
): Promise<void> {
  const category = categories.get(dataCategoryId);
  if (!category) {
    throw new Error(`Category ${dataCategoryId} not found`);
  }

  Object.assign(category, payload);
  categories.set(dataCategoryId, category);
}

export async function deleteCustomDataCategory(
  dataCategoryId: number,
  _moduleId?: number,
  _extensionkey?: string,
): Promise<void> {
  categories.delete(dataCategoryId);
  values.delete(dataCategoryId);
}

// ============================================================================
// Value Operations
// ============================================================================

export async function getCustomDataValues<T extends object>(
  dataCategoryId: number,
  _moduleId?: number,
  _extensionkey?: string,
): Promise<(T & Omit<CustomModuleDataValue, 'value'>)[]> {
  const categoryValues = values.get(dataCategoryId);
  if (!categoryValues) {
    return [];
  }

  return Array.from(categoryValues.values()).map((val) => {
    const { value, ...rest } = val;

    let parsedData: T = {} as T;
    if (value) {
      try {
        parsedData = JSON.parse(value) as T;
      } catch {
        // ignore parse errors
      }
    }

    return {
      ...rest,
      ...parsedData,
    };
  });
}

export async function createCustomDataValue(
  payload: CustomModuleDataValueCreate,
  _moduleId?: number,
  _extensionkey?: string,
): Promise<CustomModuleDataValue> {
  const categoryValues = values.get(payload.dataCategoryId);
  if (!categoryValues) {
    throw new Error(`Category ${payload.dataCategoryId} not found`);
  }

  const newValue: CustomModuleDataValue = {
    id: nextValueId++,
    dataCategoryId: payload.dataCategoryId,
    value: payload.value,
  };

  categoryValues.set(newValue.id, newValue);

  return newValue;
}

export async function updateCustomDataValue(
  dataCategoryId: number,
  valueId: number,
  payload: Partial<CustomModuleDataValue>,
  _moduleId?: number,
  _extensionkey?: string,
): Promise<void> {
  const categoryValues = values.get(dataCategoryId);
  if (!categoryValues) {
    throw new Error(`Category ${dataCategoryId} not found`);
  }

  const value = categoryValues.get(valueId);
  if (!value) {
    throw new Error(`Value ${valueId} not found in category ${dataCategoryId}`);
  }

  Object.assign(value, payload);
  categoryValues.set(valueId, value);
}

export async function deleteCustomDataValue(
  dataCategoryId: number,
  valueId: number,
  _moduleId?: number,
  _extensionkey?: string,
): Promise<void> {
  const categoryValues = values.get(dataCategoryId);
  if (!categoryValues) {
    throw new Error(`Category ${dataCategoryId} not found`);
  }

  categoryValues.delete(valueId);
}

// ============================================================================
// Helper Functions
// ============================================================================

async function resolveModuleId(
  moduleId: number | undefined,
  extensionkey?: string,
): Promise<number> {
  if (moduleId) return moduleId;
  if (!extensionkey) {
    throw new Error(
      'Either moduleId or extensionkey must be provided to resolve module ID',
    );
  }
  const module = await getModule(extensionkey);
  return module.id;
}
