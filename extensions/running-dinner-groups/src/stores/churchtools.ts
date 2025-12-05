import { defineStore } from 'pinia';
import { ref } from 'vue';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type {
  Group,
  GroupMember,
  GroupMemberFields,
  Person,
  GroupUpdatePayload,
  RawGroupMemberResponse,
  RawPersonDetails,
} from '@/types/models';

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
   * Note: Uses information.targetGroupId as that's where CT stores the parent reference
   */
  async function getChildGroups(parentId: number): Promise<Group[]> {
    loading.value = true;
    error.value = null;
    try {
      const response = await churchtoolsClient.get('/groups');
      const groups = normalizeResponse<Group>(response);
      return groups.filter((g) => g.information?.targetGroupId === parentId);
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
      const group = (await churchtoolsClient.get(`/groups/${groupId}`, {
        'include[]': 'memberStatistics',
      })) as Group;
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
    data: GroupUpdatePayload,
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
   * Fetch full person details from /persons/{personId}
   */
  async function getPersonDetails(
    personId: number,
  ): Promise<RawPersonDetails | null> {
    try {
      const response = await churchtoolsClient.get(`/persons/${personId}`);
      // Handle both direct object and { data: ... } formats
      if (response && typeof response === 'object') {
        return 'data' in response
          ? (response.data as RawPersonDetails)
          : (response as RawPersonDetails);
      }
      return null;
    } catch (err) {
      console.warn(`Failed to fetch person details for ID ${personId}:`, err);
      return null;
    }
  }

  /**
   * Transform raw API member response to our GroupMember interface.
   * Merges basic member data with full person details.
   */
  function transformMember(
    rawMember: RawGroupMemberResponse,
    personDetails: RawPersonDetails | null,
  ): GroupMember {
    const person = rawMember.person;
    const domainAttributes = person.domainAttributes;

    // Prefer full person details if available, fallback to domainAttributes
    const firstName =
      personDetails?.firstName || domainAttributes?.firstName || '';
    const lastName =
      personDetails?.lastName || domainAttributes?.lastName || '';
    const email = personDetails?.email;

    // Build phone numbers array from person details
    let phoneNumbers: { phoneNumber: string }[] | undefined;
    if (personDetails?.mobile) {
      phoneNumbers = [{ phoneNumber: personDetails.mobile }];
    } else if (personDetails?.phonePrivate) {
      phoneNumbers = [{ phoneNumber: personDetails.phonePrivate }];
    }

    // Transform fields from array format to object format
    // API returns: [{ id, name, value, sortKey }, ...]
    // We need: { mealPreference: "starter", dietaryRestrictions: "vegetarian", ... }
    let fields: GroupMemberFields | undefined;
    if (Array.isArray(rawMember.fields) && rawMember.fields.length > 0) {
      fields = {};
      for (const field of rawMember.fields as Array<{
        id: number;
        name: string;
        value: string;
        sortKey: number;
      }>) {
        if (field.name === 'mealPreference') {
          // Map display value back to internal value if needed
          const valueMap: Record<string, GroupMemberFields['mealPreference']> =
            {
              Starter: 'starter',
              starter: 'starter',
              'Main Course': 'mainCourse',
              mainCourse: 'mainCourse',
              Dessert: 'dessert',
              dessert: 'dessert',
              'No Preference': 'none',
              none: 'none',
            };
          fields.mealPreference = valueMap[field.value] || 'none';
        } else if (field.name === 'dietaryRestrictions') {
          fields.dietaryRestrictions = field.value;
        } else if (field.name === 'allergyInfo') {
          fields.allergyInfo = field.value;
        } else if (field.name === 'partnerPreference') {
          fields.partnerPreference = field.value;
        }
      }
      // If no fields were populated, set to undefined
      if (Object.keys(fields).length === 0) {
        fields = undefined;
      }
    }

    return {
      personId: rawMember.personId,
      person: {
        id: rawMember.personId,
        firstName,
        lastName,
        email,
        phoneNumbers,
        addresses: personDetails?.street
          ? [
              {
                street: personDetails.street,
                zip: personDetails.zip,
                city: personDetails.city,
              },
            ]
          : undefined,
      },
      groupMemberStatus: rawMember.groupMemberStatus as
        | 'active'
        | 'waiting'
        | 'inactive',
      groupTypeRoleId: rawMember.groupTypeRoleId,
      fields,
      memberStartDate: rawMember.memberStartDate,
      waitinglistPosition: rawMember.waitinglistPosition ?? undefined,
    };
  }

  /**
   * Get all members of a group (with pagination handled automatically)
   * Also fetches full person details for email/phone information.
   */
  async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
    loading.value = true;
    error.value = null;
    try {
      let allMembers: RawGroupMemberResponse[] = [];
      let page = 1;
      let hasMorePages = true;

      // ChurchTools API returns paginated results (typically 10 per page)
      while (hasMorePages) {
        const response = await churchtoolsClient.get(
          `/groups/${groupId}/members?page=${page}`,
        );
        const members = normalizeResponse<RawGroupMemberResponse>(response);

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

      // Fetch full person details for each member (in parallel)
      const personDetailsMap = new Map<number, RawPersonDetails>();
      await Promise.all(
        allMembers.map(async (member) => {
          const details = await getPersonDetails(member.personId);
          if (details) {
            personDetailsMap.set(member.personId, details);
          }
        }),
      );

      // Transform raw API response to our GroupMember interface
      return allMembers.map((member) =>
        transformMember(member, personDetailsMap.get(member.personId) ?? null),
      );
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
      const response = await churchtoolsClient.get('/group/grouptypes');
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
      const response = await churchtoolsClient.get('/group/roles');
      const allRoles = normalizeResponse<any>(response);
      // Filter roles by group type
      return allRoles.filter((role: any) => role.groupTypeId === groupTypeId);
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
