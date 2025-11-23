import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  PersistanceCategory,
  type CategoryValue,
} from '@churchtools-extensions/persistance';
import { KEY } from '../config';
import type { Group } from '../types/models';
import { GroupSchema, getCurrentTimestamp } from '../types/models';

export const useGroupStore = defineStore('group', () => {
  const groups = ref<CategoryValue<Group>[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  let category: PersistanceCategory<Group> | null = null;
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
          categoryShorty: 'groups',
          categoryName: 'Groups',
        });
      } finally {
        categoryInitPromise = null;
      }
    })();

    await categoryInitPromise;
  }

  // ==================== CRUD Operations ====================

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;
      const list = await category.list<Group>();
      groups.value = list;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load groups';
      console.error('fetchAll groups failed', e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchById(id: number) {
    try {
      await ensureCategory();
      if (!category) return null;
      const group = await category.getById<Group>(id);
      return group;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load group';
      console.error('fetchById group failed', e);
      return null;
    }
  }

  async function create(record: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>) {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;

      const now = getCurrentTimestamp();
      const validated = GroupSchema.parse({
        ...record,
        createdAt: now,
        updatedAt: now,
      });

      const { id } = await category.create(validated);
      await fetchAll();
      return id;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to create group';
      console.error('create group failed', e);
    } finally {
      saving.value = false;
    }
  }

  async function update(id: number, patch: Partial<Group>) {
    saving.value = true;
    error.value = null;
    try {
      if (!category) await ensureCategory();
      if (!category) return;

      const existing = groups.value.find((i) => i.id === id);
      if (!existing) throw new Error('Group not found');

      const merged = GroupSchema.parse({
        ...existing.value,
        ...patch,
        updatedAt: getCurrentTimestamp(),
      });

      await category.update(id, merged);
      await fetchAll();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to update group';
      console.error('update group failed', e);
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: number) {
    saving.value = true;
    error.value = null;
    try {
      if (!category) await ensureCategory();
      if (!category) return;
      await category.delete(id);
      await fetchAll();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to delete group';
      console.error('delete group failed', e);
    } finally {
      saving.value = false;
    }
  }

  // ==================== Batch Operations ====================

  async function createMultiple(
    records: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>[],
  ) {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;

      const now = getCurrentTimestamp();
      const validated = records.map((record) =>
        GroupSchema.parse({
          ...record,
          createdAt: now,
          updatedAt: now,
        }),
      );

      // Create all groups
      const promises = validated.map((group) => category!.create(group));
      await Promise.all(promises);

      await fetchAll();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to create groups';
      console.error('create multiple groups failed', e);
    } finally {
      saving.value = false;
    }
  }

  async function deleteByDinnerId(dinnerId: number) {
    saving.value = true;
    error.value = null;
    try {
      if (!category) await ensureCategory();
      if (!category) return;

      const dinnerGroups = getByDinnerId(dinnerId);
      const promises = dinnerGroups.map((group) => category!.delete(group.id!));
      await Promise.all(promises);

      await fetchAll();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to delete groups';
      console.error('delete groups by dinner failed', e);
    } finally {
      saving.value = false;
    }
  }

  async function saveOrUpdateMultiple(
    dinnerId: number,
    records: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>[],
  ) {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;

      const now = getCurrentTimestamp();
      const existingGroups = getByDinnerId(dinnerId);

      // Create a map of existing groups by groupNumber for quick lookup
      const existingByGroupNumber = new Map(
        existingGroups.map((g) => [g.value.groupNumber, g]),
      );

      const promises: Promise<any>[] = [];

      // Process each record
      for (const record of records) {
        const existing = existingByGroupNumber.get(record.groupNumber);

        if (existing) {
          // Update existing group
          const merged = GroupSchema.parse({
            ...existing.value,
            ...record,
            updatedAt: now,
          });
          promises.push(category.update(existing.id!, merged));
          existingByGroupNumber.delete(record.groupNumber);
        } else {
          // Create new group
          const validated = GroupSchema.parse({
            ...record,
            createdAt: now,
            updatedAt: now,
          });
          promises.push(category.create(validated));
        }
      }

      // Delete groups that are no longer in the new set
      for (const [, existing] of existingByGroupNumber) {
        promises.push(category.delete(existing.id!));
      }

      await Promise.all(promises);
      await fetchAll();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to save or update groups';
      console.error('saveOrUpdateMultiple groups failed', e);
    } finally {
      saving.value = false;
    }
  }

  // ==================== Queries ====================

  function getByDinnerId(dinnerId: number) {
    return groups.value.filter((g) => g.value.dinnerId === dinnerId);
  }

  function getById(id: number) {
    return groups.value.find((g) => g.id === id);
  }

  function getByParticipantId(participantId: number) {
    return groups.value.find((g) =>
      g.value.participantIds.includes(participantId),
    );
  }

  return {
    // State
    groups,
    loading,
    saving,
    error,

    // CRUD
    fetchAll,
    fetchById,
    create,
    update,
    remove,

    // Batch operations
    createMultiple,
    deleteByDinnerId,
    saveOrUpdateMultiple,

    // Queries
    getByDinnerId,
    getById,
    getByParticipantId,
  };
});
