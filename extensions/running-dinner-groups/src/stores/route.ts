import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  PersistanceCategory,
  type CategoryValue,
} from '@churchtools-extensions/persistance';
import { KEY } from '@/config';
import { type Route } from '@/types/models';

/**
 * Store for managing Routes (KV store)
 * Routes represent dinner routes for meal groups
 */
export const useRouteStore = defineStore('route', () => {
  const routes = ref<CategoryValue<Route>[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  let category: PersistanceCategory<Route> | null = null;
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
          categoryShorty: 'route',
          categoryName: 'Routes',
        });
      } finally {
        categoryInitPromise = null;
      }
    })();

    await categoryInitPromise;
  }

  /**
   * Fetch all routes from KV store
   */
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;
      const result = await category.list<Route>();
      routes.value = result;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to fetch routes';
      console.error('fetchAll error:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create multiple routes (batch)
   */
  async function createMultiple(
    newRoutes: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) throw new Error('Category not initialized');
      const now = new Date().toISOString();
      const promises = newRoutes.map((route) => {
        const routeData: Route = {
          ...route,
          createdAt: now,
          updatedAt: now,
        };
        return category!.create(routeData);
      });

      await Promise.all(promises);
      await fetchAll(); // Refresh list
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to create routes';
      console.error('createMultiple error:', err);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Delete all routes for an event
   */
  async function deleteByEventId(eventMetadataId: number): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) throw new Error('Category not initialized');
      const routesToDelete = routes.value.filter(
        (r) => r.value.eventMetadataId === eventMetadataId,
      );

      const promises = routesToDelete.map((route) =>
        category!.delete(route.id),
      );

      await Promise.all(promises);
      await fetchAll(); // Refresh list
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to delete routes';
      console.error('deleteByEventId error:', err);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Get all routes for a specific event
   */
  function getByEventId(eventMetadataId: number): CategoryValue<Route>[] {
    return routes.value.filter(
      (r) => r.value.eventMetadataId === eventMetadataId,
    );
  }

  /**
   * Get route for a specific dinner group
   */
  function getByDinnerGroupId(
    dinnerGroupId: number,
  ): CategoryValue<Route> | undefined {
    return routes.value.find((r) => r.value.dinnerGroupId === dinnerGroupId);
  }

  return {
    routes,
    loading,
    saving,
    error,
    fetchAll,
    createMultiple,
    deleteByEventId,
    getByEventId,
    getByDinnerGroupId,
  };
});
