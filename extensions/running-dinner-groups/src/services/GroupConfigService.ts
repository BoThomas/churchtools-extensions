import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Group, GroupMember, Person } from '@/types/models';
import { useEventMetadataStore } from '@/stores/eventMetadata';

/**
 * Service for configuring ChurchTools groups for Running Dinner events
 */
export class GroupConfigService {
  private static PARENT_GROUP_NAME = 'Running Dinner';
  private static DIENST_TYPE_NAME = 'Dienst'; // Service group type

  /**
   * Check if parent group "Running Dinner" exists and if current user is a leader
   */
  async checkParentGroup(): Promise<{
    exists: boolean;
    group?: Group;
    isLeader?: boolean;
  }> {
    try {
      // Fetch all groups and search for "Running Dinner"
      const response = await churchtoolsClient.get('/groups');
      const groups = Array.isArray(response)
        ? (response as Group[])
        : (response as { data: Group[] }).data;

      const parentGroup = groups.find(
        (g) => g.name === GroupConfigService.PARENT_GROUP_NAME,
      );

      if (!parentGroup) {
        return { exists: false };
      }

      // Get current user
      const currentUser = (await churchtoolsClient.get('/whoami')) as Person;

      // Check if current user is a leader (Leiter or Co-Leiter)
      const membersResponse = await churchtoolsClient.get(
        `/groups/${parentGroup.id}/members`,
      );
      const members = Array.isArray(membersResponse)
        ? (membersResponse as GroupMember[])
        : (membersResponse as { data: GroupMember[] }).data;

      const userMembership = members.find((m) => m.personId === currentUser.id);

      // Check if user is an active member of the group
      const isLeader =
        userMembership && userMembership.groupMemberStatus === 'active';

      return {
        exists: true,
        group: parentGroup,
        isLeader: Boolean(isLeader),
      };
    } catch (error) {
      console.error('Failed to check parent group:', error);
      throw new Error('Failed to check parent group existence');
    }
  }

  /**
   * Create the parent "Running Dinner" group
   */
  async createParentGroup(options: {
    leaderPersonId: number;
    coLeaderPersonIds: number[];
  }): Promise<Group> {
    try {
      // 1. Get group types to find "Dienst" type
      const groupTypesResponse =
        await churchtoolsClient.get('/group/grouptypes');
      const groupTypes = Array.isArray(groupTypesResponse)
        ? groupTypesResponse
        : (groupTypesResponse as { data: any[] }).data;

      const dienstType = groupTypes.find(
        (type: any) => type.name === GroupConfigService.DIENST_TYPE_NAME,
      );

      if (!dienstType) {
        throw new Error(
          `Group type "${GroupConfigService.DIENST_TYPE_NAME}" not found`,
        );
      }

      // 2. Get available roles for Dienst group type
      const rolesResponse = await churchtoolsClient.get('/group/roles');
      const allRoles = Array.isArray(rolesResponse)
        ? rolesResponse
        : (rolesResponse as { data: any[] }).data;

      // Filter roles by group type
      const roles = allRoles.filter(
        (role: any) => role.groupTypeId === dienstType.id,
      );

      const leiterRole = roles.find((role: any) => role.name === 'Leiter');
      const coLeiterRole = roles.find((role: any) => role.name === 'Co-Leiter');

      if (!leiterRole) {
        throw new Error('Leiter role not found in Dienst group type');
      }

      // 3. Create the parent group
      // Note: groupStatusId 1 = 'active', 2 = 'pending', 3 = 'archived', 4 = 'finished'
      const groupData = {
        name: GroupConfigService.PARENT_GROUP_NAME,
        groupTypeId: dienstType.id,
        groupStatusId: 1, // Active status
      };

      const createdGroup = (await churchtoolsClient.post(
        '/groups',
        groupData,
      )) as Group;

      // 4. Assign Leiter role to leader (if specified)
      if (options.leaderPersonId) {
        await churchtoolsClient.put(
          `/groups/${createdGroup.id}/members/${options.leaderPersonId}`,
          {
            groupTypeRoleId: leiterRole.id,
            groupMemberStatus: 'active',
          },
        );
      }

      // 5. Assign Co-Leiter role(s) to co-leaders
      if (coLeiterRole && options.coLeaderPersonIds.length > 0) {
        for (const coLeaderId of options.coLeaderPersonIds) {
          await churchtoolsClient.put(
            `/groups/${createdGroup.id}/members/${coLeaderId}`,
            {
              groupTypeRoleId: coLeiterRole.id,
              groupMemberStatus: 'active',
            },
          );
        }
      }

      // 6. Store parent group ID in extension metadata (could be in a settings category)
      // For now, we'll just return the group and let the caller handle storage
      console.log(
        'Parent group created successfully:',
        createdGroup.id,
        createdGroup.name,
      );

      return createdGroup;
    } catch (error) {
      console.error('Failed to create parent group:', error);
      throw new Error('Failed to create parent group');
    }
  }

  /**
   * Create a new child group under the parent "Running Dinner" group
   * and automatically configure it for running dinner use
   */
  async createChildGroup(options: {
    parentGroupId: number;
    name: string;
    description: string;
    date: string;
    maxMembers: number;
    organizerId: number;
    preferredGroupSize: number;
    allowPartnerPreferences: boolean;
    // CT-native registration settings
    leaderPersonId: number; // Required - group must have a leader for people to join
    coLeaderPersonIds?: number[]; // Optional co-leaders
    signUpOpeningDate?: string | null; // ISO date when registration opens (null = immediate)
    signUpClosingDate?: string | null; // ISO date when registration closes
    // Waitlist settings
    allowWaitinglist?: boolean; // Default: true
    automaticMoveUp?: boolean; // Auto-promote from waitlist when spots open
    waitlistMaxPersons?: number | null; // Max waitlist size (null = unlimited)
    // Co-registration settings
    allowSpouseRegistration?: boolean; // CT-native spouse co-registration
    menu: {
      starter: { startTime: string; endTime: string };
      mainCourse: { startTime: string; endTime: string };
      dessert: { startTime: string; endTime: string };
    };
    afterParty?: {
      time: string;
      location: string;
      description?: string;
      isDessertLocation?: boolean;
    };
  }): Promise<number> {
    let createdGroupId: number | null = null;

    try {
      // 1. Get group types to find "Maßnahme" type
      const groupTypesResponse =
        await churchtoolsClient.get('/group/grouptypes');
      const groupTypes = Array.isArray(groupTypesResponse)
        ? groupTypesResponse
        : (groupTypesResponse as { data: any[] }).data;

      const massnahmeType = groupTypes.find(
        (type: any) => type.name === 'Maßnahme',
      );

      if (!massnahmeType) {
        throw new Error('Group type "Maßnahme" not found');
      }

      // 2. Create child group - according to API spec, creation only accepts flat fields
      const groupData = {
        name: options.name,
        groupTypeId: massnahmeType.id,
        groupStatusId: 1, // Active status
        parentGroupId: options.parentGroupId, // Set parent relationship
      };

      const createdGroup = (await churchtoolsClient.post(
        '/groups',
        groupData,
      )) as Group;

      // Track created group ID for cleanup on failure
      createdGroupId = createdGroup.id;

      // 3. Update group with additional information and settings using CT-native features
      // Apply defaults for optional settings
      const allowWaitinglist = options.allowWaitinglist ?? true;
      const automaticMoveUp = options.automaticMoveUp ?? true;
      const allowSpouseRegistration = options.allowSpouseRegistration ?? true;

      await churchtoolsClient.patch(`/groups/${createdGroup.id}`, {
        information: {
          note: options.description,
          meetingTime: options.date,
          groupCategoryId: null,
          campusId: null,
        },
        settings: {
          // Registration control - CT-native lifecycle management
          isOpenForMembers: options.signUpOpeningDate ? false : true, // If opening date set, start closed; otherwise open immediately
          signUpOpeningDate: options.signUpOpeningDate ?? null, // Auto-open registration at this date
          signUpClosingDate: options.signUpClosingDate ?? null, // Auto-close registration at this date

          // Visibility - 'intern' for MVP (church members only)
          isPublic: false, // Not public (use 'intern' visibility)
          isHidden: false, // Visible to church members

          // Waitlist settings - CT-native waitlist management
          allowWaitinglist: allowWaitinglist,
          automaticMoveUp: automaticMoveUp, // Auto-promote from waitlist when spots open
          waitinglistMaxPersons: options.waitlistMaxPersons ?? null, // null = unlimited

          // Co-registration settings
          allowSpouseRegistration: allowSpouseRegistration,
          allowOtherRegistration: false, // Not needed if using partner preference field

          // Capacity
          maxMembers: options.maxMembers,
          inStatistic: true,
        },
      });

      // 4. Assign leader to the group (REQUIRED for people to be able to join)
      await this.assignGroupLeader(
        createdGroup.id,
        options.leaderPersonId,
        massnahmeType.id,
      );

      // 4b. Assign co-leaders if provided
      if (options.coLeaderPersonIds && options.coLeaderPersonIds.length > 0) {
        await this.assignGroupCoLeaders(
          createdGroup.id,
          options.coLeaderPersonIds,
          massnahmeType.id,
        );
      }

      // 5. Create custom group-member fields
      await this.ensureCustomFields(
        createdGroup.id,
        options.allowPartnerPreferences,
      );

      // 6. Create EventMetadata in KV store
      const eventMetadataStore = useEventMetadataStore();
      const eventMetadataId = await eventMetadataStore.create({
        groupId: createdGroup.id,
        menu: options.menu,
        afterParty: options.afterParty
          ? {
              time: options.afterParty.time,
              location: options.afterParty.location,
              description: options.afterParty.description,
              isDessertLocation: options.afterParty.isDessertLocation ?? false,
            }
          : undefined,
        preferredGroupSize: options.preferredGroupSize,
        allowPartnerPreferences: options.allowPartnerPreferences,
        status: 'active',
        organizerId: options.organizerId,
      });

      console.log(
        'Child group created successfully:',
        createdGroup.id,
        'with EventMetadata:',
        eventMetadataId,
      );

      return createdGroup.id;
    } catch (error) {
      console.error('Failed to create child group:', error);

      // Clean up: delete the created group if it exists
      if (createdGroupId !== null) {
        try {
          console.log(
            'Cleaning up: deleting partially created group',
            createdGroupId,
          );
          await churchtoolsClient.deleteApi(`/groups/${createdGroupId}`);
          console.log('Successfully deleted group', createdGroupId);
        } catch (deleteError) {
          console.error(
            'Failed to delete partially created group:',
            deleteError,
          );
        }
      }

      // Preserve the original error message
      const originalMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create child group: ${originalMessage}`);
    }
  }

  /**
   * Assign a leader (Leiter) to a group
   * This is REQUIRED for people to be able to join the group
   * @param groupId - The ChurchTools group ID
   * @param leaderPersonId - The person ID to assign as leader
   * @param groupTypeId - The group type ID (to find the correct role)
   */
  async assignGroupLeader(
    groupId: number,
    leaderPersonId: number,
    groupTypeId: number,
  ): Promise<void> {
    try {
      // Get roles for this group type
      const rolesResponse = await churchtoolsClient.get('/group/roles');
      const allRoles = Array.isArray(rolesResponse)
        ? rolesResponse
        : (rolesResponse as { data: any[] }).data;

      // Filter roles by group type and find Leiter
      const roles = allRoles.filter(
        (role: any) => role.groupTypeId === groupTypeId,
      );

      console.log(
        'Group type ID:',
        groupTypeId,
        'Available roles for this type:',
        roles.map((r: any) => ({ id: r.id, name: r.name })),
      );

      const leiterRole = roles.find((role: any) => role.name === 'Leiter');

      if (!leiterRole) {
        console.warn(
          'Leiter role not found for group type, using first available role',
        );
        // Use the first available role if Leiter doesn't exist
        const fallbackRole = roles[0];
        if (!fallbackRole) {
          throw new Error(
            `No roles available for group type ID ${groupTypeId}. Please configure roles for the "Maßnahme" group type in ChurchTools under Settings > Groups > Group Types.`,
          );
        }
      }

      // Add the leader as a member with the Leiter role
      await churchtoolsClient.put(
        `/groups/${groupId}/members/${leaderPersonId}`,
        {
          groupTypeRoleId: leiterRole?.id || roles[0]?.id,
          groupMemberStatus: 'active',
        },
      );

      console.log(
        'Group leader assigned:',
        leaderPersonId,
        'to group:',
        groupId,
      );
    } catch (error) {
      console.error('Failed to assign group leader:', error);
      const originalMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to assign group leader: ${originalMessage}`);
    }
  }

  /**
   * Assign co-leaders (Co-Leiter) to a group
   * @param groupId - The ChurchTools group ID
   * @param coLeaderPersonIds - Array of person IDs to assign as co-leaders
   * @param groupTypeId - The group type ID (to find the correct role)
   */
  async assignGroupCoLeaders(
    groupId: number,
    coLeaderPersonIds: number[],
    groupTypeId: number,
  ): Promise<void> {
    try {
      // Get roles for this group type
      const rolesResponse = await churchtoolsClient.get('/group/roles');
      const allRoles = Array.isArray(rolesResponse)
        ? rolesResponse
        : (rolesResponse as { data: any[] }).data;

      // Filter roles by group type and find Co-Leiter
      const roles = allRoles.filter(
        (role: any) => role.groupTypeId === groupTypeId,
      );
      const coLeiterRole = roles.find((role: any) => role.name === 'Co-Leiter');

      if (!coLeiterRole) {
        console.warn(
          'Co-Leiter role not found for group type, skipping co-leader assignment',
        );
        return;
      }

      // Assign each co-leader
      for (const coLeaderId of coLeaderPersonIds) {
        await churchtoolsClient.put(
          `/groups/${groupId}/members/${coLeaderId}`,
          {
            groupTypeRoleId: coLeiterRole.id,
            groupMemberStatus: 'active',
          },
        );
      }

      console.log(
        'Group co-leaders assigned:',
        coLeaderPersonIds,
        'to group:',
        groupId,
      );
    } catch (error) {
      console.error('Failed to assign group co-leaders:', error);
      const originalMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to assign group co-leaders: ${originalMessage}`);
    }
  }

  /**
   * Ensure custom group-member fields exist on the group
   * @param groupId - The ChurchTools group ID
   * @param allowPartnerPreferences - Whether to create the partner preference field
   */
  async ensureCustomFields(
    groupId: number,
    allowPartnerPreferences: boolean,
  ): Promise<void> {
    try {
      // Get existing fields
      const existingFieldsResponse = await churchtoolsClient.get(
        `/groups/${groupId}/memberfields`,
      );
      const existingFields = Array.isArray(existingFieldsResponse)
        ? existingFieldsResponse
        : (existingFieldsResponse as { data: any[] }).data;

      const fieldNames = existingFields.map((f: any) => f.name);

      // Define required fields
      const requiredFields = [
        {
          name: 'mealPreference',
          label: 'Meal Preference',
          fieldTypeCode: 'select',
          options: [
            { id: 'starter', name: 'Starter' },
            { id: 'mainCourse', name: 'Main Course' },
            { id: 'dessert', name: 'Dessert' },
            { id: 'none', name: 'No Preference' },
          ],
          isRequired: true,
          helpText:
            'Which meal would you prefer to host? (This is a preference, not a guarantee)',
        },
        {
          name: 'dietaryRestrictions',
          label: 'Dietary Restrictions',
          fieldTypeCode: 'textarea',
          isRequired: false,
          helpText:
            'Please list any dietary restrictions (vegetarian, vegan, allergies, etc.)',
        },
        {
          name: 'allergyInfo',
          label: 'Allergy Information',
          fieldTypeCode: 'textarea',
          isRequired: false,
          helpText:
            'Please provide detailed allergy information for meal planning',
        },
      ];

      // Conditionally add partner preference field
      if (allowPartnerPreferences) {
        requiredFields.push({
          name: 'partnerPreference',
          label: 'Partner Preference',
          fieldTypeCode: 'text',
          isRequired: false,
          helpText:
            'Enter names or emails of people you would like to be grouped with (comma-separated)',
        });
      }

      // Create missing fields
      for (const field of requiredFields) {
        if (!fieldNames.includes(field.name)) {
          const fieldData: any = {
            name: field.name,
            label: field.label,
            fieldTypeCode: field.fieldTypeCode,
            isRequired: field.isRequired,
            helpText: field.helpText,
            securityLevel: 1, // Security level for field visibility
            useInRegistrationForm: true, // Always show in registration form
            requiredInRegistrationForm: field.isRequired, // Only required if field is required
          };

          // Add options for select fields
          if (field.fieldTypeCode === 'select' && 'options' in field) {
            fieldData.options = field.options;
          }

          await churchtoolsClient.post(
            `/groups/${groupId}/memberfields/group`,
            fieldData,
          );
          console.log(`Created field: ${field.name}`);
        }
      }
    } catch (error) {
      console.error('Failed to ensure custom fields:', error);
      const originalMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create custom fields: ${originalMessage}`);
    }
  }

  /**
   * Update group settings (lock/unlock registration)
   */
  async updateGroupSettings(
    groupId: number,
    settings: {
      isOpenForMembers?: boolean;
      maxMembers?: number;
      isPublic?: boolean;
      allowWaitinglist?: boolean;
    },
  ): Promise<void> {
    try {
      await churchtoolsClient.patch(`/groups/${groupId}`, {
        settings,
      });
      console.log('Group settings updated:', groupId, settings);
    } catch (error) {
      console.error('Failed to update group settings:', error);
      const originalMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update group settings: ${originalMessage}`);
    }
  }

  /**
   * Update parent group leaders
   */
  async updateParentGroupLeaders(options: {
    parentGroupId: number;
    leaderPersonId?: number;
    coLeaderPersonIds?: number[];
  }): Promise<void> {
    try {
      // Get current members to find existing leaders
      const membersResponse = await churchtoolsClient.get(
        `/groups/${options.parentGroupId}/members`,
      );
      const members = Array.isArray(membersResponse)
        ? (membersResponse as GroupMember[])
        : (membersResponse as { data: GroupMember[] }).data;

      // Get role IDs
      const parentGroup = (await churchtoolsClient.get(
        `/groups/${options.parentGroupId}`,
      )) as Group;
      const rolesResponse = await churchtoolsClient.get(
        `/grouptypes/${parentGroup.groupTypeId}/roles`,
      );
      const roles = Array.isArray(rolesResponse)
        ? rolesResponse
        : (rolesResponse as { data: any[] }).data;

      const leiterRole = roles.find((role: any) => role.name === 'Leiter');
      const coLeiterRole = roles.find((role: any) => role.name === 'Co-Leiter');

      // Update Leiter if specified
      if (options.leaderPersonId && leiterRole) {
        // Remove current Leiter
        const currentLeiter = members.find(
          (m) => m.groupTypeRoleId === leiterRole.id,
        );
        if (currentLeiter) {
          await churchtoolsClient.deleteApi(
            `/groups/${options.parentGroupId}/members/${currentLeiter.personId}`,
          );
        }

        // Add new Leiter
        await churchtoolsClient.post(
          `/groups/${options.parentGroupId}/members`,
          {
            personId: options.leaderPersonId,
            groupTypeRoleId: leiterRole.id,
          },
        );
      }

      // Update Co-Leiter if specified
      if (options.coLeaderPersonIds && coLeiterRole) {
        // Remove current Co-Leiter
        const currentCoLeiters = members.filter(
          (m) => m.groupTypeRoleId === coLeiterRole.id,
        );
        for (const coLeiter of currentCoLeiters) {
          await churchtoolsClient.deleteApi(
            `/groups/${options.parentGroupId}/members/${coLeiter.personId}`,
          );
        }

        // Add new Co-Leiter(s)
        for (const coLeaderId of options.coLeaderPersonIds) {
          await churchtoolsClient.post(
            `/groups/${options.parentGroupId}/members`,
            {
              personId: coLeaderId,
              groupTypeRoleId: coLeiterRole.id,
            },
          );
        }
      }

      console.log('Parent group leaders updated');
    } catch (error) {
      console.error('Failed to update parent group leaders:', error);
      throw new Error('Failed to update parent group leaders');
    }
  }

  /**
   * Get all persons for leader selection
   */
  async getAllPersons(): Promise<Person[]> {
    try {
      const response = await churchtoolsClient.get('/persons');
      return Array.isArray(response)
        ? (response as Person[])
        : (response as { data: Person[] }).data;
    } catch (error) {
      console.error('Failed to fetch persons:', error);
      throw new Error('Failed to fetch persons');
    }
  }
}

// Export singleton instance
export const groupConfigService = new GroupConfigService();
