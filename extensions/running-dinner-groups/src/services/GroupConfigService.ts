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
    try {
      // 1. Get parent group to get its group type
      const parentGroup = (await churchtoolsClient.get(
        `/groups/${options.parentGroupId}`,
      )) as Group;

      // 2. Create child group
      const groupData = {
        name: options.name,
        groupTypeId: parentGroup.groupTypeId,
        targetGroupId: options.parentGroupId, // Set parent relationship
        information: {
          note: options.description,
          meetingTime: options.date,
          groupCategoryId: null,
          campusId: null,
        },
        settings: {
          isOpenForMembers: false, // Initially closed, will be opened by organizer
          isPublic: true, // Public so participants can find it
          isHidden: false, // Visible
          allowWaitinglist: true, // Enable waitlist
          maxMembers: options.maxMembers,
          inStatistic: true, // Include in stats
        },
      };

      const createdGroup = (await churchtoolsClient.post(
        '/groups',
        groupData,
      )) as Group;

      // 3. Create custom group-member fields
      await this.ensureCustomFields(
        createdGroup.id,
        options.allowPartnerPreferences,
      );

      // 4. Create EventMetadata in KV store
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
      throw new Error('Failed to create child group');
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
          fieldType: 'select',
          options: [
            { value: 'starter', label: 'Starter' },
            { value: 'mainCourse', label: 'Main Course' },
            { value: 'dessert', label: 'Dessert' },
            { value: 'none', label: 'No Preference' },
          ],
          isRequired: true,
          helpText:
            'Which meal would you prefer to host? (This is a preference, not a guarantee)',
        },
        {
          name: 'dietaryRestrictions',
          label: 'Dietary Restrictions',
          fieldType: 'textarea',
          isRequired: false,
          helpText:
            'Please list any dietary restrictions (vegetarian, vegan, allergies, etc.)',
        },
        {
          name: 'allergyInfo',
          label: 'Allergy Information',
          fieldType: 'textarea',
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
          fieldType: 'text',
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
            fieldType: field.fieldType,
            isRequired: field.isRequired,
            helpText: field.helpText,
            requiredInRegistrationForm: field.isRequired,
          };

          // Add options for select fields
          if (field.fieldType === 'select' && 'options' in field) {
            fieldData.options = field.options;
          }

          await churchtoolsClient.post(
            `/groups/${groupId}/memberfields`,
            fieldData,
          );
          console.log(`Created field: ${field.name}`);
        }
      }
    } catch (error) {
      console.error('Failed to ensure custom fields:', error);
      throw new Error('Failed to create custom fields');
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
      throw new Error('Failed to update group settings');
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
