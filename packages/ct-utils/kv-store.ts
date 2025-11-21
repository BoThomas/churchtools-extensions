/**
 * This module provides easy to use access to KV storage
 */
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type {
  CustomModule,
  CustomModuleCreate,
  CustomModuleDataCategory,
  CustomModuleDataCategoryCreate,
  CustomModuleDataValue,
  CustomModuleDataValueCreate,
} from './ct-types';

/**
 * ────────────────────────────────────────────────
 *  CUSTOM MODULE itself
 * ────────────────────────────────────────────────
 */
/**
 * retrieves the module configuration
 * @param extensionkey the extension key (shorty) to identify the module
 * @returns  the custom module
 */
export async function getModule(extensionkey: string): Promise<CustomModule> {
  //console.log("Extension Key:", extensionkey);
  const allModules: Array<CustomModule> =
    await churchtoolsClient.get(`/custommodules`);
  //console.log("Retrieving Modules", allModules);

  const module = allModules.find(
    (item: CustomModule) => item.shorty === extensionkey,
  );

  if (!module) {
    throw new Error(`Module for extension key "${extensionkey}" not found.`);
  }

  console.log(`Module ${extensionkey} found:`, module);

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
  const createData: CustomModuleCreate = {
    name: name,
    shorty: extensionkey,
    description: description,
    sortKey: 100,
  };

  const newModule = await churchtoolsClient.post<CustomModule>(
    '/custommodules',
    createData,
  );

  console.log(`Created new module for ${extensionkey}:`, newModule);
  return newModule;
}

/**
 * Resolves module id either on provided number or using the getModule function
 * @param moduleId the module ID
 * @param extensionkey the extension key (required if moduleId is not provided)
 * @returns moduleId
 */
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

/**
 * ────────────────────────────────────────────────
 *  CUSTOM DATA CATEGORIES
 * ────────────────────────────────────────────────
 */

/**
 * retrieves a list of all custom data categories
 * T is used to cast JSON data into readable object
 * @param moduleId - the module id
 * @param extensionkey - the extension key (required if moduleId is not provided)
 * @returns list of category objects and repective data following T
 * implements GET `/custommodules/{moduleId}/customdatacategories`
 */
export async function getCustomDataCategories<T extends object>(
  moduleId?: number,
  extensionkey?: string,
): Promise<(T & Omit<CustomModuleDataCategory, 'data'>)[]> {
  moduleId = await resolveModuleId(moduleId, extensionkey);

  const categories: CustomModuleDataCategory[] = await churchtoolsClient.get(
    `/custommodules/${moduleId}/customdatacategories`,
  );

  return categories.map((category) => {
    const { data, ...rest } = category;

    let parsedData: T;

    parsedData = safeParseJSON(data, {} as T);

    return {
      ...rest,
      ...parsedData,
    };
  });
}

/**
 * retrieve a single category
 * @param shorty short name of the category
 * @param moduleId - the module id
 * @param extensionkey - the extension key (required if moduleId is not provided)
 * @returns the one category with matching name - if it exists
 */
export async function getCustomDataCategory<T extends object>(
  shorty: string,
  moduleId?: number,
  extensionkey?: string,
): Promise<CustomModuleDataCategory | undefined> {
  const categories = await getCustomDataCategories<T>(moduleId, extensionkey);
  return categories.find((category) => category.shorty === shorty);
}

/**
 * Create a new custom data category
 * Implements: POST `/custommodules/{moduleId}/customdatacategories`
 * @param payload new data to be saved
 * @param moduleId - the module id
 * @param extensionkey - the extension key (required if moduleId is not provided)
 * @returns - the created category
 */
export async function createCustomDataCategory(
  payload: CustomModuleDataCategoryCreate,
  moduleId?: number,
  extensionkey?: string,
): Promise<CustomModuleDataCategory> {
  moduleId = await resolveModuleId(moduleId, extensionkey);
  const newCategory: CustomModuleDataCategory = await churchtoolsClient.post(
    `/custommodules/${moduleId}/customdatacategories`,
    payload,
  );
  console.log(`Created category in module ${moduleId}:`, newCategory);
  return newCategory;
}

/**
 * update an existing custom data category
 * implements  PUT `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}`
 * @param dataCategoryId - the category id to update
 * @param payload - the data to update
 * @param moduleId - the module id
 * @param extensionkey - the extension key (required if moduleId is not provided)
 */
export async function updateCustomDataCategory(
  dataCategoryId: number,
  payload: Partial<CustomModuleDataCategory>,
  moduleId?: number,
  extensionkey?: string,
): Promise<void> {
  moduleId = await resolveModuleId(moduleId, extensionkey);
  const updatedCategory: CustomModuleDataCategory = await churchtoolsClient.put(
    `/custommodules/${moduleId}/customdatacategories/${dataCategoryId}`,
    payload,
  );
  console.log(
    `Updated category ${dataCategoryId} in module ${moduleId}:`,
    updatedCategory,
  );
}

/**
 * Delete an existing custom data category
 * implements DELETE `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}`
 * @param dataCategoryId - the category id to delete
 * @param moduleId - the module id
 * @param extensionkey - the extension key (required if moduleId is not provided)
 */
export async function deleteCustomDataCategory(
  dataCategoryId: number,
  moduleId?: number,
  extensionkey?: string,
): Promise<void> {
  moduleId = await resolveModuleId(moduleId, extensionkey);
  await churchtoolsClient.deleteApi(
    `/custommodules/${moduleId}/customdatacategories/${dataCategoryId}`,
  );
  console.log(`Deleted category ${dataCategoryId} from module ${moduleId}`);
}

/**
 * ────────────────────────────────────────────────
 *  CUSTOM DATA VALUES
 * ────────────────────────────────────────────────
 */

/** Get existing custom data value and cast it's JSON content into readable format of type T
 * implements GET `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues`
 * @param dataCategoryId - the category id
 * @param moduleId - the module id
 * @param extensionkey - the extension key (required if moduleId is not provided)
 * @returns - the custom data value casted as T and metadata
 */
export async function getCustomDataValues<T extends object>(
  dataCategoryId: number,
  moduleId?: number,
  extensionkey?: string,
): Promise<(T & Omit<CustomModuleDataValue, 'value'>)[]> {
  moduleId = await resolveModuleId(moduleId, extensionkey);

  const values: (Omit<CustomModuleDataValue, 'value'> & { value: string })[] =
    await churchtoolsClient.get(
      `/custommodules/${moduleId}/customdatacategories/${dataCategoryId}/customdatavalues`,
    );

  return values.map((val) => {
    const { value, ...rest } = val;

    if (value == null) {
      throw new Error(
        `Custom data value ${val.id} has null or undefined 'value' field.`,
      );
    }

    let parsedData = safeParseJSON(value, {} as T);

    return {
      ...rest,
      ...parsedData,
    };
  });
}

/**
 * Create a new custom data value
 * implements POST `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues`
 * @param payload - the data to create
 * @param moduleId - the module id
 * @param extensionkey - the extension key (required if moduleId is not provided)
 */
export async function createCustomDataValue(
  payload: CustomModuleDataValueCreate,
  moduleId?: number,
  extensionkey?: string,
): Promise<void> {
  moduleId = await resolveModuleId(moduleId, extensionkey);
  const newValue: string = await churchtoolsClient.post(
    `/custommodules/${moduleId}/customdatacategories/${payload.dataCategoryId}/customdatavalues`,
    payload,
  );
  console.log(
    `Created data value in category ${payload.dataCategoryId}:`,
    newValue,
  );
}

/**
 * update an existing custom data value.
 * implements PUT `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues/{valueId}`
 * @param dataCategoryId - the category id
 * @param valueId - the value id to update
 * @param payload - the data to update
 * @param moduleId - the module id
 * @param extensionkey - the extension key (required if moduleId is not provided)
 */
export async function updateCustomDataValue(
  dataCategoryId: number,
  valueId: number,
  payload: Partial<CustomModuleDataValue>,
  moduleId?: number,
  extensionkey?: string,
): Promise<void> {
  moduleId = await resolveModuleId(moduleId, extensionkey);
  const updatedValue: CustomModuleDataValue = await churchtoolsClient.put(
    `/custommodules/${moduleId}/customdatacategories/${dataCategoryId}/customdatavalues/${valueId}`,
    payload,
  );
  console.log(
    `Updated data value ${valueId} in category ${dataCategoryId}:`,
    updatedValue,
  );
}

/**
 * delete an existing custom data value
 * implements DELETE `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues/{valueId}`
 * @param dataCategoryId - the category id
 * @param valueId - the value id to delete
 * @param moduleId - the module id
 * @param extensionkey - the extension key (required if moduleId is not provided)
 */
export async function deleteCustomDataValue(
  dataCategoryId: number,
  valueId: number,
  moduleId?: number,
  extensionkey?: string,
): Promise<void> {
  moduleId = await resolveModuleId(moduleId, extensionkey);
  await churchtoolsClient.deleteApi(
    `/custommodules/${moduleId}/customdatacategories/${dataCategoryId}/customdatavalues/${valueId}`,
  );
  console.log(`Deleted data value ${valueId} from category ${dataCategoryId}`);
}

/**
 * ────────────────────────────────────────────────
 *  Other Utils
 * ────────────────────────────────────────────────
 */

function safeParseJSON<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (err) {
    console.warn('Failed to parse JSON:', err);
    return fallback;
  }
}
