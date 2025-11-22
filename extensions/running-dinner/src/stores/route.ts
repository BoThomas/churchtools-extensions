import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  PersistanceCategory,
  type CategoryValue,
} from '@churchtools-extensions/persistance';
import { KEY } from '../config';
import type { Route } from '../types/models';
import { RouteSchema, getCurrentTimestamp } from '../types/models';

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
          categoryShorty: 'routes',
          categoryName: 'Routes',
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
      const list = await category.list<Route>();
      routes.value = list;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load routes';
      console.error('fetchAll routes failed', e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchById(id: number) {
    try {
      await ensureCategory();
      if (!category) return null;
      const route = await category.getById<Route>(id);
      return route;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load route';
      console.error('fetchById route failed', e);
      return null;
    }
  }

  async function create(record: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>) {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;

      const now = getCurrentTimestamp();
      const validated = RouteSchema.parse({
        ...record,
        createdAt: now,
        updatedAt: now,
      });

      const { id } = await category.create(validated);
      await fetchAll();
      return id;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to create route';
      console.error('create route failed', e);
    } finally {
      saving.value = false;
    }
  }

  async function update(id: number, patch: Partial<Route>) {
    saving.value = true;
    error.value = null;
    try {
      if (!category) await ensureCategory();
      if (!category) return;

      const existing = routes.value.find((i) => i.id === id);
      if (!existing) throw new Error('Route not found');

      const merged = RouteSchema.parse({
        ...existing.value,
        ...patch,
        updatedAt: getCurrentTimestamp(),
      });

      await category.update(id, merged);
      await fetchAll();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to update route';
      console.error('update route failed', e);
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
      error.value = e?.message ?? 'Failed to delete route';
      console.error('delete route failed', e);
    } finally {
      saving.value = false;
    }
  }

  // ==================== Batch Operations ====================

  async function createMultiple(
    records: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[],
  ) {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;

      const now = getCurrentTimestamp();
      const validated = records.map((record) =>
        RouteSchema.parse({
          ...record,
          createdAt: now,
          updatedAt: now,
        }),
      );

      // Create all routes
      const promises = validated.map((route) => category!.create(route));
      await Promise.all(promises);

      await fetchAll();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to create routes';
      console.error('create multiple routes failed', e);
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

      const dinnerRoutes = getByDinnerId(dinnerId);
      const promises = dinnerRoutes.map((route) => category!.delete(route.id!));
      await Promise.all(promises);

      await fetchAll();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to delete routes';
      console.error('delete routes by dinner failed', e);
    } finally {
      saving.value = false;
    }
  }

  // ==================== Queries ====================

  function getByDinnerId(dinnerId: number) {
    return routes.value.filter((r) => r.value.dinnerId === dinnerId);
  }

  function getByGroupId(groupId: number) {
    return routes.value.find((r) => r.value.groupId === groupId);
  }

  function getById(id: number) {
    return routes.value.find((r) => r.id === id);
  }

  return {
    // State
    routes,
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

    // Queries
    getByDinnerId,
    getByGroupId,
    getById,
  };
});
