import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  PersistanceCategory,
  type CategoryValue,
} from '@churchtools-extensions/persistance';
import { KEY } from '@/config';
import { type DinnerGroup } from '@/types/models';

/**
 * Store for managing DinnerGroups (KV store)
 * DinnerGroups represent meal groups (2-4 people eating together)
 */
export const useDinnerGroupStore = defineStore('dinnerGroup', () => {
  const dinnerGroups = ref<CategoryValue<DinnerGroup>[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  let category: PersistanceCategory<DinnerGroup> | null = null;
  let categoryInitPromise: Promise<void> | null = null;

  async function ensureCategory() {
    if (category) return;
    if (categoryInitPromise) {
      await categoryInitPromise;
      return;
    }

    categoryInitPromise = (async () => {
      try {
        category = await PersistanceCategory.init({
          extensionkey: KEY,
          categoryShorty: 'dinnerGroup',
          categoryName: 'Dinner Groups',
        });
      } finally {
        categoryInitPromise = null;
      }
    })();

    await categoryInitPromise;
  }

  /**
   * Fetch all dinner groups from KV store
   */
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;
      const result = await category.list<DinnerGroup>();
      dinnerGroups.value = result;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to fetch dinner groups';
      console.error('fetchAll error:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create multiple dinner groups (batch)
   */
  async function createMultiple(
    groups: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) throw new Error('Category not initialized');
      const now = new Date().toISOString();
      const promises = groups.map((group) => {
        const groupData: DinnerGroup = {
          ...group,
          createdAt: now,
          updatedAt: now,
        };
        return category!.create(groupData);
      });

      await Promise.all(promises);
      await fetchAll(); // Refresh list
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to create dinner groups';
      console.error('createMultiple error:', err);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Update a dinner group
   */
  async function update(
    id: number,
    patch: Partial<DinnerGroup>,
  ): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
      const group = dinnerGroups.value.find((g) => g.id === id);
      if (!group) {
        throw new Error(`Dinner group with id ${id} not found`);
      }

      const updatedData: DinnerGroup = {
        ...group.value,
        ...patch,
        updatedAt: new Date().toISOString(),
      };

      await ensureCategory();
      if (!category) throw new Error('Category not initialized');
      await category.update(id, updatedData);
      await fetchAll(); // Refresh list
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to update dinner group';
      console.error('update error:', err);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Delete all dinner groups for an event
   */
  async function deleteByEventId(eventMetadataId: number): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) throw new Error('Category not initialized');
      const groupsToDelete = dinnerGroups.value.filter(
        (g) => g.value.eventMetadataId === eventMetadataId,
      );

      const promises = groupsToDelete.map((group) =>
        category!.delete(group.id),
      );

      await Promise.all(promises);
      await fetchAll(); // Refresh list
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to delete dinner groups';
      console.error('deleteByEventId error:', err);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Get all dinner groups for a specific event
   */
  function getByEventId(eventMetadataId: number): CategoryValue<DinnerGroup>[] {
    return dinnerGroups.value.filter(
      (g) => g.value.eventMetadataId === eventMetadataId,
    );
  }

  return {
    dinnerGroups,
    loading,
    saving,
    error,
    fetchAll,
    createMultiple,
    update,
    deleteByEventId,
    getByEventId,
  };
});
