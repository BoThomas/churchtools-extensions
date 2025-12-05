import { churchtoolsClient } from '@churchtools/churchtools-client';

/**
 * Email action step configuration
 */
interface EmailActionData {
  senderId: number; // 0 = system sender
  subject: string;
  body: string;
  addSignOutUrl: boolean;
}

/**
 * Routine step configuration
 */
interface RoutineStep {
  actionKey: string; // e.g., 'send-member-email'
  actionData: EmailActionData;
  isEnabled: boolean;
}

/**
 * ChurchTools Routine
 */
interface Routine {
  id: number;
  name: string;
  description: string | null;
  domainType: 'group_membership';
  isEnabled: boolean;
  priority: number;
  steps: RoutineStep[];
}

/**
 * Service for managing ChurchTools Routines (automated notifications)
 * Based on the CT Routines API documented in lifecycle-and-state.md
 *
 * NOTE: ChurchTools only allows ONE routine per groupId + roleId + status combination.
 * So we create a single "welcome" routine that fires when members become active,
 * whether they join directly or move up from the waitlist.
 */
export class RoutineService {
  /**
   * Create a welcome routine for members becoming active
   * This handles both:
   * - Direct joins (new member with status 'active')
   * - Waitlist promotions (member moves from 'waiting' to 'active')
   *
   * @param groupId - The ChurchTools group ID
   * @param groupName - The group name for the email content
   * @param groupTypeRoleId - The role ID for the target members (e.g., Teilnehmer role)
   */
  async createWelcomeRoutine(
    groupId: number,
    groupName: string,
    groupTypeRoleId: number,
  ): Promise<number> {
    try {
      // 1. Create the routine with domain context
      const routineResponse = (await churchtoolsClient.post('/routines', {
        domainType: 'group_membership',
        name: `Welcome - ${groupName}`,
        domainContext: {
          groupId: groupId,
          groupTypeRoleId: groupTypeRoleId,
          groupMemberStatus: 'active', // Triggers when member becomes active
        },
      })) as Routine | { data: Routine };

      const routine =
        'data' in routineResponse ? routineResponse.data : routineResponse;

      // 2. Add email notification step
      const emailStep: RoutineStep = {
        actionKey: 'send-member-email',
        actionData: {
          senderId: 0, // System sender
          subject: `Willkommen beim ${groupName}! 🍽️`,
          body: this.getWelcomeEmailBody(groupName),
          addSignOutUrl: true,
        },
        isEnabled: true,
      };

      // 3. Validate the step before adding
      await churchtoolsClient.post(`/routines/${routine.id}/steps/validate`, {
        actionKey: emailStep.actionKey,
        actionData: emailStep.actionData,
        isEnabled: emailStep.isEnabled,
      });

      // 4. Add the step to the routine
      await churchtoolsClient.patch(`/routines/${routine.id}`, {
        steps: [emailStep],
      });

      // 5. Enable the routine
      await churchtoolsClient.patch(`/routines/${routine.id}`, {
        isEnabled: true,
      });

      console.log(
        'Welcome routine created:',
        routine.id,
        'for group:',
        groupId,
      );

      return routine.id;
    } catch (error) {
      console.error('Failed to create welcome routine:', error);
      throw new Error('Failed to create welcome routine');
    }
  }

  /**
   * Create a late withdrawal alert routine
   * Trigger: Member status changes to 'to_delete' after registration closes
   * Action: Send notification to organizers
   *
   * @param groupId - The ChurchTools group ID
   * @param groupName - The group name
   * @param groupTypeRoleId - The role ID for the target members (e.g., Teilnehmer role)
   * @param _organizerEmail - Email of the organizer (reserved for future use)
   */
  async createLateWithdrawalRoutine(
    groupId: number,
    groupName: string,
    groupTypeRoleId: number,
    _organizerEmail?: string,
  ): Promise<number> {
    try {
      const routineResponse = (await churchtoolsClient.post('/routines', {
        domainType: 'group_membership',
        name: `Late Withdrawal Alert - ${groupName}`,
        domainContext: {
          groupId: groupId,
          groupTypeRoleId: groupTypeRoleId,
          groupMemberStatus: 'to_delete',
        },
      })) as Routine | { data: Routine };

      const routine =
        'data' in routineResponse ? routineResponse.data : routineResponse;

      // Note: This sends to the member, not organizer
      // For organizer notification, we'd need a different approach
      // (CT routines currently only support actions on the triggering member)
      const emailStep: RoutineStep = {
        actionKey: 'send-member-email',
        actionData: {
          senderId: 0,
          subject: `Abmeldung vom ${groupName}`,
          body: this.getWithdrawalConfirmationEmailBody(groupName),
          addSignOutUrl: true,
        },
        isEnabled: true,
      };

      await churchtoolsClient.post(`/routines/${routine.id}/steps/validate`, {
        actionKey: emailStep.actionKey,
        actionData: emailStep.actionData,
        isEnabled: emailStep.isEnabled,
      });

      await churchtoolsClient.patch(`/routines/${routine.id}`, {
        steps: [emailStep],
      });

      await churchtoolsClient.patch(`/routines/${routine.id}`, {
        isEnabled: true,
      });

      console.log(
        'Late withdrawal routine created:',
        routine.id,
        'for group:',
        groupId,
      );

      return routine.id;
    } catch (error) {
      console.error('Failed to create late withdrawal routine:', error);
      throw new Error('Failed to create late withdrawal routine');
    }
  }

  /**
   * Get all routines for a group
   */
  async getGroupRoutines(groupId: number): Promise<Routine[]> {
    try {
      const response = await churchtoolsClient.get(
        `/routines?domain_type=group_membership&group_id=${groupId}`,
      );
      return Array.isArray(response)
        ? (response as Routine[])
        : (response as { data: Routine[] }).data || [];
    } catch (error) {
      console.error('Failed to fetch group routines:', error);
      return [];
    }
  }

  /**
   * Delete a routine
   */
  async deleteRoutine(routineId: number): Promise<void> {
    try {
      await churchtoolsClient.deleteApi(`/routines/${routineId}`);
      console.log('Routine deleted:', routineId);
    } catch (error) {
      console.error('Failed to delete routine:', error);
      throw new Error('Failed to delete routine');
    }
  }

  /**
   * Enable or disable a routine
   */
  async setRoutineEnabled(routineId: number, enabled: boolean): Promise<void> {
    try {
      await churchtoolsClient.patch(`/routines/${routineId}`, {
        isEnabled: enabled,
      });
      console.log('Routine', routineId, 'enabled:', enabled);
    } catch (error) {
      console.error('Failed to update routine:', error);
      throw new Error('Failed to update routine');
    }
  }

  /**
   * Get available email placeholders for a group
   */
  async getEmailPlaceholders(groupId: number): Promise<string[]> {
    try {
      const [generalPlaceholders, groupPlaceholders] = await Promise.all([
        churchtoolsClient.get('/placeholders/email'),
        churchtoolsClient.get(`/placeholders/group/${groupId}`),
      ]);

      const general = Array.isArray(generalPlaceholders)
        ? generalPlaceholders
        : (generalPlaceholders as { data: any[] }).data || [];
      const group = Array.isArray(groupPlaceholders)
        ? groupPlaceholders
        : (groupPlaceholders as { data: any[] }).data || [];

      return [...general, ...group].map((p: any) => p.placeholder || p);
    } catch (error) {
      console.error('Failed to fetch email placeholders:', error);
      return [];
    }
  }

  // ==================== Email Templates ====================

  private getWelcomeEmailBody(groupName: string): string {
    return `<p>Hallo {{{person.firstName}}},</p>

<p>herzlich willkommen beim <strong>${groupName}</strong>! 🍽️</p>

<p>Schön, dass du dabei bist!</p>

<p><strong>Was passiert als nächstes?</strong><br>
Du erhältst rechtzeitig vor dem Event alle wichtigen Informationen:</p>
<ul>
<li>Deine Dinner-Gruppe (mit wem du zusammen kochst)</li>
<li>Die Route mit allen Adressen</li>
<li>Die Uhrzeiten für jeden Gang</li>
</ul>

<p><strong>Wichtig:</strong><br>
Bitte stelle sicher, dass deine Kontaktdaten und Adresse in ChurchTools aktuell sind.
Falls du besondere Essensvorlieben oder Allergien hast, trage diese bitte in deinem
Profil bei der Gruppe ein.</p>

<p>Wir freuen uns auf einen tollen Abend mit dir!</p>

<p>Liebe Grüße,<br>
Das Running Dinner Team</p>`;
  }

  private getWithdrawalConfirmationEmailBody(groupName: string): string {
    return `<p>Hallo {{{person.firstName}}},</p>

<p>wir haben deine Abmeldung vom <strong>${groupName}</strong> erhalten.</p>

<p>Schade, dass du nicht dabei sein kannst! Falls sich deine Pläne ändern und wieder
Plätze frei werden, kannst du dich gerne erneut anmelden.</p>

<p>Falls du Fragen hast, melde dich gerne bei uns.</p>

<p>Liebe Grüße,<br>
Das Running Dinner Team</p>`;
  }
}

// Export singleton instance
export const routineService = new RoutineService();
