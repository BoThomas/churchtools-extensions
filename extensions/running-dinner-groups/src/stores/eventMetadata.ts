import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  PersistanceCategory,
  type CategoryValue,
} from '@churchtools-extensions/persistance';
import { KEY } from '@/config';
import { type EventMetadata } from '@/types/models';

/**
 * Store for managing EventMetadata (KV store)
 * EventMetadata stores additional metadata not managed by ChurchTools groups
 */
export const useEventMetadataStore = defineStore('eventMetadata', () => {
  const events = ref<CategoryValue<EventMetadata>[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  let category: PersistanceCategory<EventMetadata> | null = null;
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
          categoryShorty: 'eventMetadata',
          categoryName: 'Event Metadata',
        });
      } finally {
        categoryInitPromise = null;
      }
    })();

    await categoryInitPromise;
  }

  /**
   * Fetch all events from KV store
   */
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;
      const result = await category.list<EventMetadata>();
      events.value = result;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to fetch events';
      console.error('fetchAll error:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a new event metadata entry
   */
  async function create(
    data: Omit<EventMetadata, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<number> {
    saving.value = true;
    error.value = null;
    try {
      const now = new Date().toISOString();
      const eventData: EventMetadata = {
        ...data,
        createdAt: now,
        updatedAt: now,
      };

      await ensureCategory();
      if (!category) throw new Error('Category not initialized');
      const result = await category.create(eventData);
      await fetchAll(); // Refresh list
      return result.id;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to create event';
      console.error('create error:', err);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Update an existing event metadata entry
   */
  async function update(
    id: number,
    patch: Partial<EventMetadata>,
  ): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
      const event = events.value.find((e) => e.id === id);
      if (!event) {
        throw new Error(`Event with id ${id} not found`);
      }

      const updatedData: EventMetadata = {
        ...event.value,
        ...patch,
        updatedAt: new Date().toISOString(),
      };

      await ensureCategory();
      if (!category) throw new Error('Category not initialized');
      await category.update(id, updatedData);
      await fetchAll(); // Refresh list
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to update event';
      console.error('update error:', err);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Delete an event metadata entry
   */
  async function remove(id: number): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) throw new Error('Category not initialized');
      await category.delete(id);
      await fetchAll(); // Refresh list
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to delete event';
      console.error('remove error:', err);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Find event metadata by ChurchTools group ID
   */
  function getByGroupId(
    ctGroupId: number,
  ): CategoryValue<EventMetadata> | undefined {
    return events.value.find((e) => e.value.groupId === ctGroupId);
  }

  return {
    events,
    loading,
    saving,
    error,
    fetchAll,
    create,
    update,
    remove,
    getByGroupId,
  };
});
