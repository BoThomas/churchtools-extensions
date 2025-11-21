import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  PersistanceCategory,
  type CategoryValue,
} from '@churchtools-extensions/persistance';
import { KEY } from '../config';

export interface RunningDinnerRecord {
  id?: number; // internal id in category
  name: string;
  description?: string;
  date?: string; // ISO
  city?: string;
  maxParticipants?: number;
  allowPreferredPartners: boolean;
  publicSingleSignins: boolean;
  preferredGroupSize?: number;
  allowPreferredMeal: boolean;
  registrationDeadline?: string; // ISO
  createdAt: string;
}

export const useRunningDinnerStore = defineStore('runningDinner', () => {
  const dinners = ref<CategoryValue<RunningDinnerRecord>[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  let category: PersistanceCategory<RunningDinnerRecord> | null = null;

  async function ensureCategory() {
    if (!category) {
      category = await PersistanceCategory.init({
        extensionkey: KEY,
        categoryShorty: 'runningdinners',
        categoryName: 'Running Dinners',
      });
    }
  }

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;
      const list = await category.list<RunningDinnerRecord>();
      dinners.value = list;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load running dinners';
      console.error('fetchAll running dinners failed', e);
    } finally {
      loading.value = false;
    }
  }

  async function create(record: Omit<RunningDinnerRecord, 'id'>) {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;
      const normalised: RunningDinnerRecord = {
        ...record,
        date: record.date ? normaliseDate(record.date) : undefined,
        registrationDeadline: record.registrationDeadline
          ? normaliseDate(record.registrationDeadline)
          : undefined,
      };
      const { id } = await category.create(normalised);
      await fetchAll();
      return id;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to create running dinner';
      console.error('create running dinner failed', e);
    } finally {
      saving.value = false;
    }
  }

  async function update(id: number, patch: Partial<RunningDinnerRecord>) {
    saving.value = true;
    error.value = null;
    try {
      if (!category) await ensureCategory();
      if (!category) return;
      const existing = dinners.value.find((i) => i.id === id);
      if (!existing) throw new Error('Running dinner not found');
      const merged: RunningDinnerRecord = {
        ...existing.value,
        ...patch,
      };
      if (merged.date) merged.date = normaliseDate(merged.date);
      if (merged.registrationDeadline)
        merged.registrationDeadline = normaliseDate(
          merged.registrationDeadline,
        );
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
      dinners.value = dinners.value.filter((i) => i.id !== id);
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to delete running dinner';
      console.error('delete running dinner failed', e);
    } finally {
      saving.value = false;
    }
  }

  const count = computed(() => dinners.value.length);

  function normaliseDate(value: string | Date): string {
    if (value instanceof Date) return value.toISOString();
    // attempt parse only if it looks like a date without time
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString();
    return value; // fallback (already ISO?)
  }

  return {
    // state
    dinners,
    loading,
    saving,
    error,
    count,
    // getters
    // actions
    fetchAll,
    create,
    update,
    remove,
  };
});
