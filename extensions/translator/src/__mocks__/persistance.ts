import { vi } from 'vitest';
import type { CategoryValue } from '@churchtools-extensions/persistance';

/**
 * Mock implementation of PersistanceCategory for testing
 * Simulates in-memory storage without actual API calls
 */
export class MockPersistanceCategory<T = any> {
  private data = new Map<number, CategoryValue<T>>();
  private nextId = 1;
  private static instances: MockPersistanceCategory<any>[] = [];

  constructor(_config: {
    extensionkey: string;
    categoryShorty: string;
    categoryName?: string;
  }) {
    MockPersistanceCategory.instances.push(this);
  }

  static async init<T>(config: {
    extensionkey: string;
    categoryShorty: string;
    categoryName?: string;
  }): Promise<MockPersistanceCategory<T>> {
    return new MockPersistanceCategory<T>(config);
  }

  static _resetAll(): void {
    MockPersistanceCategory.instances.forEach((instance) =>
      instance._clearData(),
    );
    MockPersistanceCategory.instances = [];
  }

  async create(value: T): Promise<{ id: number }> {
    const id = this.nextId++;
    this.data.set(id, {
      id,
      value,
      raw: {} as any,
    });
    return { id };
  }

  async list<U = T>(): Promise<CategoryValue<U>[]> {
    return Array.from(this.data.values()) as unknown as CategoryValue<U>[];
  }

  async get(id: number): Promise<CategoryValue<T> | null> {
    return this.data.get(id) || null;
  }

  async update(id: number, value: T): Promise<void> {
    if (!this.data.has(id)) {
      throw new Error(`Item with id ${id} not found`);
    }
    this.data.set(id, {
      id,
      value,
      raw: {} as any,
    });
  }

  async delete(id: number): Promise<void> {
    if (!this.data.has(id)) {
      throw new Error(`Item with id ${id} not found`);
    }
    this.data.delete(id);
  }

  async deleteCategory(): Promise<void> {
    this.data.clear();
  }

  // Helper for testing: seed data
  _seedData(items: Array<{ id?: number; value: T }>): void {
    items.forEach((item) => {
      const id = item.id ?? this.nextId++;
      this.data.set(id, {
        id,
        value: item.value,
        raw: {} as any,
      });
      if (id >= this.nextId) {
        this.nextId = id + 1;
      }
    });
  }

  // Helper for testing: clear data
  _clearData(): void {
    this.data.clear();
    this.nextId = 1;
  }
}

// Mock the entire persistance module
export const mockPersistanceCategory = vi.fn(
  MockPersistanceCategory.init,
) as any;

vi.mock('@churchtools-extensions/persistance', () => ({
  PersistanceCategory: {
    init: mockPersistanceCategory,
  },
}));
