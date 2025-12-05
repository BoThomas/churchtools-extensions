import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Group, GroupMember, Person } from '@/types/models';
import { useEventMetadataStore } from '@/stores/eventMetadata';
import { addressService } from './AddressService';
import { routineService } from './RoutineService';

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
      // Note: groupStatusId 1 = 'active', 2 = 'archived', 3 = 'ended'
      // POST /groups uses flat structure (groupStatusId at root)
      const groupData = {
        name: GroupConfigService.PARENT_GROUP_NAME,
        groupTypeId: dienstType.id,
        groupStatusId: 1, // Active status
      };

      const createdGroup = (await churchtoolsClient.post(
        '/groups',
        groupData,
      )) as Group;

      // 4. Add leader to group with Leiter role
      if (options.leaderPersonId) {
        await churchtoolsClient.put(
          `/groups/${createdGroup.id}/members/${options.leaderPersonId}`,
          {
            groupTypeRoleId: leiterRole.id,
            groupMemberStatus: 'active',
          },
        );
      }

      // 5. Add co-leaders to group with Co-Leiter role
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
    // Notification settings
    sendWelcomeEmail?: boolean; // Send welcome email to new members (default: true)
    menu: {
      starter: { startTime: string; endTime: string };
      mainCourse: { startTime: string; endTime: string };
      dessert: { startTime: string; endTime: string };
    };
    afterParty?: {
      time: string;
      address?: {
        name?: string;
        street?: string;
        zip?: string;
        city?: string;
        country?: string;
      };
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

      // Determine signUpOpeningDate:
      // - If provided, use the scheduled date (registration opens at that time)
      // - If null/not provided, use current timestamp to open registration immediately
      // NOTE: ChurchTools API automatically sets isOpenForMembers=true when signUpOpeningDate is reached
      const signUpOpeningDate =
        options.signUpOpeningDate ?? new Date().toISOString();

      await churchtoolsClient.patch(`/groups/${createdGroup.id}`, {
        // Registration settings - all at root level
        visibility: 'intern', // 'restricted' = only leaders can see, 'intern' = church members can see and register
        signUpOpeningDate: signUpOpeningDate, // Controls when registration opens (auto-sets isOpenForMembers=true)
        signUpClosingDate: options.signUpClosingDate ?? null, // Auto-close registration at this date

        // Visibility settings
        isPublic: false, // Not public to external visitors
        isHidden: false, // Visible in group listings

        // Waitlist settings
        allowWaitinglist: allowWaitinglist,
        automaticMoveUp: automaticMoveUp, // Auto-promote from waitlist when spots open
        waitinglistMaxPersons: options.waitlistMaxPersons ?? null, // null = unlimited

        // Co-registration settings - all four must be set together
        // When enabled: allows spouse, children, same email, and arbitrary person co-registration
        // When disabled: disables all co-registration options
        allowSpouseRegistration: allowSpouseRegistration,
        allowChildRegistration: allowSpouseRegistration,
        allowSameEmailRegistration: allowSpouseRegistration,
        allowOtherRegistration: allowSpouseRegistration,

        // Capacity
        maxMembers: options.maxMembers,
        inStatistic: true,

        // Group description (note)
        note: options.description,

        // Only 'information' can be nested
        information: {
          meetingTime: options.date,
          groupCategoryId: null,
          campusId: null,
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

      // 4c. Deactivate unneeded roles (Coach, Organisator)
      await this.deactivateUnneededRoles(createdGroup.id);

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
              address: options.afterParty.address,
              description: options.afterParty.description,
              isDessertLocation: options.afterParty.isDessertLocation ?? false,
            }
          : undefined,
        preferredGroupSize: options.preferredGroupSize,
        allowPartnerPreferences: options.allowPartnerPreferences,
        status: 'active',
        organizerId: options.organizerId,
      });

      // 7. Set after party location as ChurchTools "Treffpunkt" if provided
      if (options.afterParty?.address) {
        try {
          await addressService.setAfterPartyLocation(createdGroup.id, {
            name:
              options.afterParty.address.name ||
              options.afterParty.description ||
              'After Party',
            street: options.afterParty.address.street,
            zip: options.afterParty.address.zip,
            city: options.afterParty.address.city,
            country: options.afterParty.address.country || 'DE',
            icon: 'house',
            color: 'parent',
          });
          console.log(
            'After party location set as Treffpunkt for group:',
            createdGroup.id,
          );
        } catch (addressError) {
          // Log but don't fail the group creation if address setting fails
          console.warn(
            'Failed to set after party location as Treffpunkt:',
            addressError,
          );
        }
      }

      // 8. Create a group meeting (Treffen) for the event date
      try {
        // Use the after party time if available, otherwise use the dessert end time
        const meetingEndTime =
          options.afterParty?.time || options.menu.dessert.endTime;

        await addressService.createGroupMeeting(
          createdGroup.id,
          options.date, // Event date as start
          meetingEndTime, // End time
        );
        console.log(
          'Group meeting (Treffen) created for group:',
          createdGroup.id,
        );
      } catch (meetingError) {
        // Log but don't fail the group creation if meeting creation fails
        console.warn('Failed to create group meeting (Treffen):', meetingError);
      }

      // 9. Create ChurchTools Routines for automated notifications (if enabled)
      // Note: Routine creation failures should not block event creation
      // CT only allows ONE routine per groupId + roleId + status combination,
      // so we create a single welcome routine that fires for all new active members
      // (whether they joined directly or got promoted from the waitlist)
      const sendWelcomeEmail = options.sendWelcomeEmail ?? true;

      if (sendWelcomeEmail) {
        let teilnehmerRoleId: number | null = null;
        try {
          const rolesResponse = await churchtoolsClient.get('/group/roles');
          const allRoles = Array.isArray(rolesResponse)
            ? rolesResponse
            : (rolesResponse as { data: any[] }).data;

          // Filter roles by group type (Maßnahme) and find Teilnehmer
          const teilnehmerRole = allRoles.find(
            (role: any) =>
              role.groupTypeId === massnahmeType.id &&
              role.name === 'Teilnehmer',
          );

          if (teilnehmerRole) {
            teilnehmerRoleId = teilnehmerRole.id;
          } else {
            console.warn(
              'Teilnehmer role not found for Maßnahme group type, skipping routine creation',
            );
          }
        } catch (roleError) {
          console.warn(
            'Failed to fetch roles for routine creation:',
            roleError,
          );
        }

        // Create welcome routine if we have the role ID
        if (teilnehmerRoleId !== null) {
          try {
            await routineService.createWelcomeRoutine(
              createdGroup.id,
              options.name,
              teilnehmerRoleId,
            );
            console.log('Welcome routine created for group:', createdGroup.id);
          } catch (routineError) {
            console.warn('Failed to create welcome routine:', routineError);
          }
        }
      } else {
        console.log('Welcome email disabled, skipping routine creation');
      }

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

      // Extract meaningful error message from API response
      let originalMessage = 'Unknown error';
      if (error instanceof Error) {
        originalMessage = error.message;
        // Check for ChurchTools API error structure in the cause or response
        const anyError = error as any;
        if (anyError.response?.data?.message) {
          originalMessage = anyError.response.data.message;
        } else if (anyError.response?.data?.translatedMessage) {
          originalMessage = anyError.response.data.translatedMessage;
        } else if (anyError.cause?.message) {
          originalMessage = anyError.cause.message;
        }
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        if (errorObj.message) {
          originalMessage = errorObj.message;
        } else if (errorObj.translatedMessage) {
          originalMessage = errorObj.translatedMessage;
        }
      } else {
        originalMessage = String(error);
      }

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

      // Add each co-leader as a member (use PUT to add new members)
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
          nameInSignupForm: 'Meal Preference',
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
          nameInSignupForm: 'Dietary Restrictions',
          fieldTypeCode: 'textarea',
          isRequired: false,
          helpText:
            'Please list any dietary restrictions (vegetarian, vegan, allergies, etc.)',
        },
        {
          name: 'allergyInfo',
          nameInSignupForm: 'Allergy Information',
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
          nameInSignupForm: 'Partner Preference ("Firstname Lastname")',
          fieldTypeCode: 'text',
          isRequired: false,
          helpText:
            'Enter the full name ("Firstname Lastname") of people you would like to be grouped with. Separate multiple names with commas.',
        });
      }

      // Create missing fields
      for (const field of requiredFields) {
        if (!fieldNames.includes(field.name)) {
          const fieldData: any = {
            name: field.name,
            nameInSignupForm: field.nameInSignupForm,
            fieldTypeCode: field.fieldTypeCode,
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
      const groupTypeId = parentGroup.information?.groupTypeId;
      if (!groupTypeId) {
        throw new Error('Parent group type ID not found');
      }
      const rolesResponse = await churchtoolsClient.get(
        `/grouptypes/${groupTypeId}/roles`,
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
   * Deactivate unneeded roles (Coach, Organisator) for a group
   * These roles are not needed for Running Dinner events and clutter the UI
   * @param groupId - The ChurchTools group ID
   */
  async deactivateUnneededRoles(groupId: number): Promise<void> {
    const rolesToDeactivate = ['Coach', 'Organisator'];

    try {
      // Fetch group with roles included
      const response = await churchtoolsClient.get(
        `/groups?include[]=roles&ids[]=${groupId}&limit=1`,
      );
      const groups = Array.isArray(response)
        ? response
        : (response as { data: any[] }).data;

      const group = groups[0];
      if (!group || !group.roles) {
        console.warn('Could not fetch group roles for deactivation');
        return;
      }

      // Find and deactivate the unwanted roles
      for (const roleName of rolesToDeactivate) {
        const role = group.roles.find((r: any) => r.name === roleName);
        if (role && role.isActive) {
          try {
            await churchtoolsClient.patch(
              `/groups/${groupId}/roles/${role.id}`,
              {
                isActive: false,
                countsTowardsSeats: false,
              },
            );
            console.log(
              `Deactivated role "${roleName}" (ID: ${role.id}) for group ${groupId}`,
            );
          } catch (roleError) {
            // Log but don't fail the entire operation for role deactivation
            console.warn(`Failed to deactivate role "${roleName}":`, roleError);
          }
        }
      }
    } catch (error) {
      // Log but don't fail the entire operation for role deactivation
      console.warn('Failed to deactivate unneeded roles:', error);
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
