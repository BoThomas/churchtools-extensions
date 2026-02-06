/**
 * PersistanceCategory — class-based wrapper for ChurchTools Custom Modules categories.
 *
 * This is a convenience wrapper around kv-store.ts that provides a class-based API
 * with state management for working with Custom Module data categories.
 */
import {
  getModule,
  getCustomDataCategory,
  createCustomDataCategory,
  getCustomDataValues,
  createCustomDataValue,
  updateCustomDataValue,
  deleteCustomDataValue,
  deleteCustomDataCategory,
} from '@churchtools-extensions/ct-utils/kv-store';
import type { CustomModuleDataValue } from '@churchtools-extensions/ct-utils/ct-types';

// -------- Public class API --------

export type CategoryOptions = {
  extensionkey: string; // required - must be provided by the extension
  categoryShorty: string;
  categoryName?: string;
  categoryDescription?: string;
};

export type CategoryValue<T = unknown> = {
  id: number;
  value: T;
  raw: CustomModuleDataValue;
};

export type CacheOptions = {
  useCache?: {
    maxAgeMs: number;
  };
};

export class PersistanceCategory<T = unknown> {
  private moduleId!: number;
  private categoryId!: number;

  private valuesCache: Map<
    number,
    {
      data: Array<CategoryValue>;
      timestamp: number;
    }
  > = new Map();

  private constructor() {}

  static async init(options: CategoryOptions): Promise<PersistanceCategory> {
    const instance = new PersistanceCategory();
    const extensionkey = options.extensionkey;
    if (!extensionkey)
      throw new Error(
        'Missing extensionkey - must be provided by the extension',
      );
    const categoryShorty = options.categoryShorty;
    if (!categoryShorty) throw new Error('Missing categoryShorty');

    const module = await getModule(extensionkey);
    instance.moduleId = module.id;

    let category = await getCustomDataCategory(categoryShorty, module.id);
    if (!category) {
      category = await createCustomDataCategory(
        {
          customModuleId: instance.moduleId,
          name: options.categoryName ?? categoryShorty,
          shorty: categoryShorty,
          description:
            options.categoryDescription ?? 'Category for extension values',
        },
        instance.moduleId,
      );
    }

    instance.categoryId = category.id;
    return instance;
  }

  private async listRaw(): Promise<(any & { id: number })[]> {
    return getCustomDataValues<any>(this.categoryId, this.moduleId);
  }

  async list<TOut = T>(
    options?: CacheOptions,
  ): Promise<Array<CategoryValue<TOut>>> {
    const useCache = options?.useCache;

    if (useCache) {
      const cached = this.valuesCache.get(this.categoryId);
      const ageMs = cached ? Date.now() - cached.timestamp : Infinity;

      if (cached && ageMs < useCache.maxAgeMs) {
        console.log(
          '[Cache] Using cached values for category:',
          this.categoryId,
        );
        return cached.data as Array<CategoryValue<TOut>>;
      }
    }

    const vals = await this.listRaw();
    const result = vals.map((rec: any) => ({
      id: rec.id,
      value: rec as TOut,
      raw: rec as unknown as CustomModuleDataValue,
    }));

    this.valuesCache.set(this.categoryId, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }

  async getById<TOut = T>(
    id: number,
    options?: CacheOptions,
  ): Promise<CategoryValue<TOut> | undefined> {
    const vals = await this.list<TOut>(
      options || { useCache: { maxAgeMs: 0 } },
    );
    return vals.find((v) => Number(v.id) === id);
  }

  async create<TIn = T>(value: TIn) {
    const created = await createCustomDataValue(
      {
        dataCategoryId: this.categoryId,
        value: JSON.stringify(value),
      },
      this.moduleId,
    );
    this.clearValuesCache();
    return { id: created.id };
  }

  async update<TIn = T>(id: number, value: TIn) {
    await updateCustomDataValue(
      this.categoryId,
      id,
      {
        value: JSON.stringify(value),
      },
      this.moduleId,
    );
    this.clearValuesCache();
    return { id };
  }

  async delete(id: number): Promise<void> {
    await deleteCustomDataValue(this.categoryId, id, this.moduleId);
  }

  async deleteCategory(): Promise<void> {
    await deleteCustomDataCategory(this.categoryId, this.moduleId);
    this.clearValuesCache();
  }

  private clearValuesCache(): void {
    if (this.valuesCache.has(this.categoryId)) {
      this.valuesCache.delete(this.categoryId);
      console.log(
        '[Cache] Cleared values cache for category:',
        this.categoryId,
      );
    }
  }
}
