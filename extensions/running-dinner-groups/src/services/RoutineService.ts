import { churchtoolsClient } from '@churchtools/churchtools-client';

/**
 * Email action step configuration
 */
interface EmailActionData {
  type: 'send-member-email';
  subject: string;
  body: string;
  isEnabled: boolean;
}

/**
 * Routine step configuration
 */
interface RoutineStep {
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
 */
export class RoutineService {
  /**
   * Create a routine for waitlist promotion notification
   * Trigger: Member status changes from 'waiting' to 'active'
   * Action: Send welcome email with instructions
   *
   * @param groupId - The ChurchTools group ID
   * @param groupName - The group name for the email content
   */
  async createWaitlistPromotionRoutine(
    groupId: number,
    groupName: string,
  ): Promise<number> {
    try {
      // 1. Create the routine with domain context
      const routineResponse = (await churchtoolsClient.post('/routines', {
        domainType: 'group_membership',
        name: `Waitlist Promotion - ${groupName}`,
        domainContext: {
          groupId: groupId,
          groupMemberStatus: 'active', // Triggers when member becomes active
        },
      })) as Routine | { data: Routine };

      const routine =
        'data' in routineResponse ? routineResponse.data : routineResponse;

      // 2. Add email notification step
      const emailStep: RoutineStep = {
        actionData: {
          type: 'send-member-email',
          subject: `Willkommen beim ${groupName}! Du bist jetzt dabei! 🎉`,
          body: this.getWaitlistPromotionEmailBody(groupName),
          isEnabled: true,
        },
        isEnabled: true,
      };

      // 3. Validate the step before adding
      await churchtoolsClient.post(`/routines/${routine.id}/steps/validate`, {
        actionData: emailStep.actionData,
        isEnabled: true,
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
        'Waitlist promotion routine created:',
        routine.id,
        'for group:',
        groupId,
      );

      return routine.id;
    } catch (error) {
      console.error('Failed to create waitlist promotion routine:', error);
      throw new Error('Failed to create waitlist promotion routine');
    }
  }

  /**
   * Create a welcome routine for new active members
   * Trigger: New member joins with status 'active'
   * Action: Send welcome email
   *
   * @param groupId - The ChurchTools group ID
   * @param groupName - The group name for the email content
   */
  async createWelcomeRoutine(
    groupId: number,
    groupName: string,
  ): Promise<number> {
    try {
      // 1. Create the routine
      const routineResponse = (await churchtoolsClient.post('/routines', {
        domainType: 'group_membership',
        name: `Welcome - ${groupName}`,
        domainContext: {
          groupId: groupId,
          groupMemberStatus: 'active',
        },
      })) as Routine | { data: Routine };

      const routine =
        'data' in routineResponse ? routineResponse.data : routineResponse;

      // 2. Add welcome email step
      const emailStep: RoutineStep = {
        actionData: {
          type: 'send-member-email',
          subject: `Willkommen beim ${groupName}! 🍽️`,
          body: this.getWelcomeEmailBody(groupName),
          isEnabled: true,
        },
        isEnabled: true,
      };

      // 3. Validate and add step
      await churchtoolsClient.post(`/routines/${routine.id}/steps/validate`, {
        actionData: emailStep.actionData,
        isEnabled: true,
      });

      await churchtoolsClient.patch(`/routines/${routine.id}`, {
        steps: [emailStep],
      });

      // 4. Enable the routine
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
   * @param _organizerEmail - Email of the organizer (reserved for future use)
   */
  async createLateWithdrawalRoutine(
    groupId: number,
    groupName: string,
    _organizerEmail?: string,
  ): Promise<number> {
    try {
      const routineResponse = (await churchtoolsClient.post('/routines', {
        domainType: 'group_membership',
        name: `Late Withdrawal Alert - ${groupName}`,
        domainContext: {
          groupId: groupId,
          groupMemberStatus: 'to_delete',
        },
      })) as Routine | { data: Routine };

      const routine =
        'data' in routineResponse ? routineResponse.data : routineResponse;

      // Note: This sends to the member, not organizer
      // For organizer notification, we'd need a different approach
      // (CT routines currently only support actions on the triggering member)
      const emailStep: RoutineStep = {
        actionData: {
          type: 'send-member-email',
          subject: `Abmeldung vom ${groupName}`,
          body: this.getWithdrawalConfirmationEmailBody(groupName),
          isEnabled: true,
        },
        isEnabled: true,
      };

      await churchtoolsClient.post(`/routines/${routine.id}/steps/validate`, {
        actionData: emailStep.actionData,
        isEnabled: true,
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

  private getWaitlistPromotionEmailBody(groupName: string): string {
    return `
Hallo {{{person.firstName}}},

großartige Neuigkeiten! 🎉

Du bist von der Warteliste aufgerückt und jetzt offiziell beim **${groupName}** dabei!

**Was passiert als nächstes?**
Du erhältst rechtzeitig vor dem Event alle wichtigen Informationen:
- Deine Dinner-Gruppe
- Die Route mit allen Adressen
- Die Uhrzeiten für jeden Gang

**Deine Angaben:**
Falls du deine Essensvorlieben oder andere Angaben noch nicht gemacht hast,
melde dich bitte in ChurchTools bei der Gruppe an und fülle die Felder aus.

Wir freuen uns auf einen tollen Abend mit dir!

Liebe Grüße,
Das Running Dinner Team
    `.trim();
  }

  private getWelcomeEmailBody(groupName: string): string {
    return `
Hallo {{{person.firstName}}},

herzlich willkommen beim **${groupName}**! 🍽️

Schön, dass du dabei bist!

**Was passiert als nächstes?**
Du erhältst rechtzeitig vor dem Event alle wichtigen Informationen:
- Deine Dinner-Gruppe (mit wem du zusammen kochst)
- Die Route mit allen Adressen
- Die Uhrzeiten für jeden Gang

**Wichtig:**
Bitte stelle sicher, dass deine Kontaktdaten und Adresse in ChurchTools aktuell sind.
Falls du besondere Essensvorlieben oder Allergien hast, trage diese bitte in deinem
Profil bei der Gruppe ein.

Wir freuen uns auf einen tollen Abend mit dir!

Liebe Grüße,
Das Running Dinner Team
    `.trim();
  }

  private getWithdrawalConfirmationEmailBody(groupName: string): string {
    return `
Hallo {{{person.firstName}}},

wir haben deine Abmeldung vom **${groupName}** erhalten.

Schade, dass du nicht dabei sein kannst! Falls sich deine Pläne ändern und wieder
Plätze frei werden, kannst du dich gerne erneut anmelden.

Falls du Fragen hast, melde dich gerne bei uns.

Liebe Grüße,
Das Running Dinner Team
    `.trim();
  }
}

// Export singleton instance
export const routineService = new RoutineService();
