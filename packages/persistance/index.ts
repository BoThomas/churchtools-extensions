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
} from '../utils/kv-store';
import type { CustomModuleDataValue } from '../utils/ct-types';

// -------- Public class API --------

export type CategoryOptions = {
  extensionkey?: string; // defaults to VITE_KEY
  categoryShorty: string;
  categoryName?: string;
  categoryDescription?: string;
};

export type CategoryValue<T = unknown> = {
  id: number;
  value: T;
  raw: CustomModuleDataValue;
};

export class PersistanceCategory<T = unknown> {
  private moduleId!: number;
  private categoryId!: number;

  private constructor() {}

  static async init(options: CategoryOptions): Promise<PersistanceCategory> {
    const instance = new PersistanceCategory();
    const extensionkey = options.extensionkey ?? import.meta.env.VITE_KEY;
    if (!extensionkey) throw new Error('Missing extensionkey (VITE_KEY)');
    const categoryShorty = options.categoryShorty;
    if (!categoryShorty) throw new Error('Missing categoryShorty');

    const module = await getModule(extensionkey);
    instance.moduleId = module.id;

    let category = await getCustomDataCategory(categoryShorty);
    if (!category) {
      category = await createCustomDataCategory({
        customModuleId: instance.moduleId,
        name: options.categoryName ?? categoryShorty,
        shorty: categoryShorty,
        description:
          options.categoryDescription ?? 'Category for extension values',
      });
    }

    instance.categoryId = category.id;
    return instance;
  }

  private async listRaw(): Promise<(any & { id: number })[]> {
    return getCustomDataValues<any>(this.categoryId, this.moduleId);
  }

  async list<TOut = T>(): Promise<Array<CategoryValue<TOut>>> {
    const vals = await this.listRaw();
    return vals.map((rec: any) => ({
      id: rec.id,
      value: rec as TOut,
      raw: rec as unknown as CustomModuleDataValue,
    }));
  }

  async getById<TOut = T>(
    id: number,
  ): Promise<CategoryValue<TOut> | undefined> {
    const vals = await this.list<TOut>();
    return vals.find((v) => v.id === id);
  }

  async create<TIn = T>(value: TIn) {
    await createCustomDataValue(
      {
        dataCategoryId: this.categoryId,
        value: JSON.stringify(value),
      },
      this.moduleId,
    );
    // kv-store createCustomDataValue doesn't return the created object, so we fetch the list to get the ID
    const vals = await this.listRaw();
    const created = vals[vals.length - 1];
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
    return { id };
  }

  async delete(id: number): Promise<void> {
    await deleteCustomDataValue(this.categoryId, id, this.moduleId);
  }
}
