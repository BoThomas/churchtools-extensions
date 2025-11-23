import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  PersistanceCategory,
  type CategoryValue,
} from '@churchtools-extensions/persistance';
import { KEY } from '../config';
import type { RunningDinner } from '../types/models';
import { RunningDinnerSchema, getCurrentTimestamp } from '../types/models';

export const useRunningDinnerStore = defineStore('runningDinner', () => {
  const dinners = ref<CategoryValue<RunningDinner>[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  let category: PersistanceCategory<RunningDinner> | null = null;
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
          categoryShorty: 'runningdinners',
          categoryName: 'Running Dinners',
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
      const list = await category.list<RunningDinner>();
      dinners.value = list;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load running dinners';
      console.error('fetchAll running dinners failed', e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchById(id: number) {
    try {
      await ensureCategory();
      if (!category) return null;
      const dinner = await category.getById<RunningDinner>(id);
      return dinner;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load running dinner';
      console.error('fetchById running dinner failed', e);
      return null;
    }
  }

  async function create(
    record: Omit<RunningDinner, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;

      const now = getCurrentTimestamp();
      const validated = RunningDinnerSchema.parse({
        ...record,
        createdAt: now,
        updatedAt: now,
      });

      const { id } = await category.create(validated);
      await fetchAll();
      return id;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to create running dinner';
      console.error('create running dinner failed', e);
    } finally {
      saving.value = false;
    }
  }

  async function update(id: number, patch: Partial<RunningDinner>) {
    saving.value = true;
    error.value = null;
    try {
      if (!category) await ensureCategory();
      if (!category) return;

      const existing = dinners.value.find((i) => i.id === id);
      if (!existing) throw new Error('Running dinner not found');

      const merged = RunningDinnerSchema.parse({
        ...existing.value,
        ...patch,
        updatedAt: getCurrentTimestamp(),
      });

      await category.update(id, merged);
      await fetchAll();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to update running dinner';
      console.error('update running dinner failed', e);
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
      error.value = e?.message ?? 'Failed to delete running dinner';
      console.error('delete running dinner failed', e);
    } finally {
      saving.value = false;
    }
  }

  // ==================== Status Management ====================

  async function publish(id: number) {
    await update(id, {
      status: 'published',
      publishedAt: getCurrentTimestamp(),
    });
  }

  async function closeRegistration(id: number) {
    await update(id, { status: 'registration-closed' });
  }

  async function markGroupsCreated(id: number) {
    await update(id, { status: 'groups-created' });
  }

  async function markRoutesAssigned(id: number) {
    await update(id, { status: 'routes-assigned' });
  }

  async function markCompleted(id: number) {
    await update(id, { status: 'completed' });
  }

  async function resetToRegistrationClosed(id: number) {
    await update(id, { status: 'registration-closed' });
  }

  async function resetToGroupsCreated(id: number) {
    await update(id, { status: 'groups-created' });
  }

  // ==================== Computed & Queries ====================

  const publishedDinners = computed(() => {
    return dinners.value.filter(
      (d) => d.value.status !== 'draft' && d.value.status !== 'completed',
    );
  });

  const draftDinners = computed(() => {
    return dinners.value.filter((d) => d.value.status === 'draft');
  });

  const activeDinners = computed(() => {
    return dinners.value.filter(
      (d) =>
        d.value.status === 'published' ||
        d.value.status === 'registration-closed' ||
        d.value.status === 'groups-created' ||
        d.value.status === 'routes-assigned',
    );
  });

  function getDinnerById(id: number) {
    return dinners.value.find((d) => d.id === id);
  }

  return {
    // State
    dinners,
    loading,
    saving,
    error,

    // CRUD
    fetchAll,
    fetchById,
    create,
    update,
    remove,

    // Status management
    publish,
    closeRegistration,
    markGroupsCreated,
    markRoutesAssigned,
    markCompleted,
    resetToRegistrationClosed,
    resetToGroupsCreated,

    // Computed
    publishedDinners,
    draftDinners,
    activeDinners,
    getDinnerById,
  };
});
