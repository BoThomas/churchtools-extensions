import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  PersistanceCategory,
  type CategoryValue,
} from '@churchtools-extensions/persistance';
import { KEY } from '../config';
import type { Participant } from '../types/models';
import { ParticipantSchema, getCurrentTimestamp } from '../types/models';

export const useParticipantStore = defineStore('participant', () => {
  const participants = ref<CategoryValue<Participant>[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  let category: PersistanceCategory<Participant> | null = null;
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
          categoryShorty: 'participants',
          categoryName: 'Participants',
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
      const list = await category.list<Participant>();
      participants.value = list;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load participants';
      console.error('fetchAll participants failed', e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchById(id: number) {
    try {
      await ensureCategory();
      if (!category) return null;
      const participant = await category.getById<Participant>(id);
      return participant;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load participant';
      console.error('fetchById participant failed', e);
      return null;
    }
  }

  async function create(
    record: Omit<Participant, 'id' | 'registeredAt' | 'updatedAt'>,
  ) {
    saving.value = true;
    error.value = null;
    try {
      await ensureCategory();
      if (!category) return;

      const now = getCurrentTimestamp();
      const validated = ParticipantSchema.parse({
        ...record,
        registeredAt: now,
        updatedAt: now,
      });

      const { id } = await category.create(validated);
      await fetchAll();
      return id;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to create participant';
      console.error('create participant failed', e);
    } finally {
      saving.value = false;
    }
  }

  async function update(id: number, patch: Partial<Participant>) {
    saving.value = true;
    error.value = null;
    try {
      if (!category) await ensureCategory();
      if (!category) return;

      const existing = participants.value.find((i) => i.id === id);
      if (!existing) throw new Error('Participant not found');

      const merged = ParticipantSchema.parse({
        ...existing.value,
        ...patch,
        updatedAt: getCurrentTimestamp(),
      });

      await category.update(id, merged);
      await fetchAll();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to update participant';
      console.error('update participant failed', e);
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
      error.value = e?.message ?? 'Failed to delete participant';
      console.error('delete participant failed', e);
    } finally {
      saving.value = false;
    }
  }

  // ==================== Status Management ====================

  async function confirm(id: number) {
    await update(id, { registrationStatus: 'confirmed' });
  }

  async function moveToWaitlist(id: number) {
    await update(id, { registrationStatus: 'waitlist' });
  }

  async function cancel(id: number) {
    await update(id, { registrationStatus: 'cancelled' });
  }

  async function assignGroup(id: number, groupId: number) {
    await update(id, { groupId });
  }

  // ==================== Computed & Queries ====================

  function getByDinnerId(dinnerId: number) {
    return participants.value.filter((p) => p.value.dinnerId === dinnerId);
  }

  function getConfirmedByDinnerId(dinnerId: number) {
    return participants.value.filter(
      (p) =>
        p.value.dinnerId === dinnerId &&
        p.value.registrationStatus === 'confirmed',
    );
  }

  function getWaitlistByDinnerId(dinnerId: number) {
    return participants.value.filter(
      (p) =>
        p.value.dinnerId === dinnerId &&
        p.value.registrationStatus === 'waitlist',
    );
  }

  function getByPersonId(personId: number) {
    return participants.value.filter((p) => p.value.personId === personId);
  }

  function getById(id: number) {
    return participants.value.find((p) => p.id === id);
  }

  return {
    // State
    participants,
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
    confirm,
    moveToWaitlist,
    cancel,
    assignGroup,

    // Queries
    getByDinnerId,
    getConfirmedByDinnerId,
    getWaitlistByDinnerId,
    getByPersonId,
    getById,
  };
});
