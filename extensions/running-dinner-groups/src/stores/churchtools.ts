import { defineStore } from 'pinia';
import { ref } from 'vue';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Group, GroupMember, Person } from '@/types/models';

/**
 * ChurchTools API wrapper store
 * Provides functions to interact with ChurchTools Groups API
 */
export const useChurchtoolsStore = defineStore('churchtools', () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Helper to normalize API responses (handle both direct array and { data: [] } formats)
  function normalizeResponse<T>(response: any): T[] {
    if (Array.isArray(response)) {
      return response as T[];
    } else if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data: T[] }).data;
    }
    console.warn('Unexpected API response format:', response);
    return [];
  }

  // ===== GROUPS =====

  /**
   * Find the "Running Dinner" parent group
   */
  async function getParentGroup(): Promise<Group | null> {
    loading.value = true;
    error.value = null;
    try {
      const response = await churchtoolsClient.get('/groups');
      const groups = normalizeResponse<Group>(response);
      const parentGroup = groups.find((g) => g.name === 'Running Dinner');
      return parentGroup || null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('getParentGroup error:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get all child groups of a parent group
   */
  async function getChildGroups(parentId: number): Promise<Group[]> {
    loading.value = true;
    error.value = null;
    try {
      const response = await churchtoolsClient.get('/groups');
      const groups = normalizeResponse<Group>(response);
      return groups.filter((g) => g.targetGroupId === parentId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('getChildGroups error:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get a single group by ID
   */
  async function getGroup(groupId: number): Promise<Group | null> {
    loading.value = true;
    error.value = null;
    try {
      const group = (await churchtoolsClient.get(
        `/groups/${groupId}`,
      )) as Group;
      return group;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('getGroup error:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a new child group
   */
  async function createChildGroup(data: Partial<Group>): Promise<Group | null> {
    loading.value = true;
    error.value = null;
    try {
      const group = (await churchtoolsClient.post('/groups', data)) as Group;
      return group;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('createChildGroup error:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update group settings
   */
  async function updateGroup(
    groupId: number,
    data: Partial<Group>,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await churchtoolsClient.patch(`/groups/${groupId}`, data);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('updateGroup error:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete a group
   */
  async function deleteGroup(groupId: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await churchtoolsClient.deleteApi(`/groups/${groupId}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('deleteGroup error:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ===== MEMBERS =====

  /**
   * Get all members of a group (with pagination handled automatically)
   */
  async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
    loading.value = true;
    error.value = null;
    try {
      let allMembers: GroupMember[] = [];
      let page = 1;
      let hasMorePages = true;

      // ChurchTools API returns paginated results (typically 10 per page)
      while (hasMorePages) {
        const response = await churchtoolsClient.get(
          `/groups/${groupId}/members?page=${page}`,
        );
        const members = normalizeResponse<GroupMember>(response);

        if (members.length === 0) {
          hasMorePages = false;
        } else {
          allMembers = [...allMembers, ...members];
          page++;
          // If we got less than 10, it's likely the last page
          if (members.length < 10) {
            hasMorePages = false;
          }
        }
      }

      return allMembers;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('getGroupMembers error:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  // ===== FIELDS =====

  /**
   * Get group member fields for a group
   */
  async function getGroupMemberFields(groupId: number): Promise<any[]> {
    loading.value = true;
    error.value = null;
    try {
      const response = await churchtoolsClient.get(
        `/groups/${groupId}/memberfields`,
      );
      return normalizeResponse<any>(response);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('getGroupMemberFields error:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a custom group member field
   */
  async function createGroupMemberField(
    groupId: number,
    field: any,
  ): Promise<any> {
    loading.value = true;
    error.value = null;
    try {
      const created = await churchtoolsClient.post(
        `/groups/${groupId}/memberfields`,
        field,
      );
      return created;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('createGroupMemberField error:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ===== PERSON =====

  /**
   * Get current logged-in user
   */
  async function getCurrentUser(): Promise<Person | null> {
    loading.value = true;
    error.value = null;
    try {
      const user = (await churchtoolsClient.get('/whoami')) as Person;
      return user;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('getCurrentUser error:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get person by ID
   */
  async function getPerson(personId: number): Promise<Person | null> {
    loading.value = true;
    error.value = null;
    try {
      const person = (await churchtoolsClient.get(
        `/persons/${personId}`,
      )) as Person;
      return person;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('getPerson error:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get all persons (for leader selection)
   */
  async function getAllPersons(): Promise<Person[]> {
    loading.value = true;
    error.value = null;
    try {
      const response = await churchtoolsClient.get('/persons');
      return normalizeResponse<Person>(response);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('getAllPersons error:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * Search persons with pagination
   */
  async function searchPersons(
    query: string = '',
    page: number = 1,
    limit: number = 50,
  ): Promise<Person[]> {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (query) {
        params.append('query', query);
      }
      const response = await churchtoolsClient.get(
        `/persons?${params.toString()}`,
      );
      return normalizeResponse<Person>(response);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('searchPersons error:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * Search for groups by name
   */
  async function searchGroups(query: string): Promise<Group[]> {
    loading.value = true;
    error.value = null;
    try {
      const response = await churchtoolsClient.get('/groups');
      const groups = normalizeResponse<Group>(response);
      return groups.filter((g) =>
        g.name.toLowerCase().includes(query.toLowerCase()),
      );
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('searchGroups error:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get group types
   */
  async function getGroupTypes(): Promise<any[]> {
    loading.value = true;
    error.value = null;
    try {
      const response = await churchtoolsClient.get('/grouptypes');
      return normalizeResponse<any>(response);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('getGroupTypes error:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get roles for a group type
   */
  async function getGroupTypeRoles(groupTypeId: number): Promise<any[]> {
    loading.value = true;
    error.value = null;
    try {
      const response = await churchtoolsClient.get(
        `/grouptypes/${groupTypeId}/roles`,
      );
      return normalizeResponse<any>(response);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('getGroupTypeRoles error:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    getParentGroup,
    getChildGroups,
    getGroup,
    createChildGroup,
    updateGroup,
    deleteGroup,
    getGroupMembers,
    getGroupMemberFields,
    createGroupMemberField,
    getCurrentUser,
    getPerson,
    getAllPersons,
    searchPersons,
    searchGroups,
    getGroupTypes,
    getGroupTypeRoles,
  };
});
