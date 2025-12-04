import type {
  EventMetadata,
  DinnerGroup,
  Route,
  GroupMember,
} from '@/types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import { generateFullRouteLink } from '@/utils/googleMaps';
import { churchtoolsClient } from '@churchtools/churchtools-client';

/**
 * Environment configuration for email sending
 */
const EMAIL_MODE = import.meta.env.VITE_EMAIL_MODE as
  | 'console'
  | 'churchtools'
  | undefined;

/**
 * Check if we should mock email sending (log to console instead of real sending)
 * In dev: defaults to console unless explicitly set to churchtools
 * In production: defaults to real sending
 */
function mockEmailSending(): boolean {
  // Explicit console mode
  if (EMAIL_MODE === 'console') {
    return true;
  }
  // In Vite dev mode, default to console unless explicitly set to churchtools
  if (import.meta.env.DEV) {
    return EMAIL_MODE !== 'churchtools';
  }
  // In production, default to real sending
  return false;
}

/**
 * Result of an email sending operation
 */
export interface EmailSendResult {
  success: boolean;
  /** Number of emails sent successfully */
  sentCount: number;
  /** Person IDs that failed (no email address, etc.) */
  failedPersonIds: number[];
  /** Error message if the operation failed entirely */
  error?: string;
  /** True if emails were only logged (development mode) */
  wasSimulated: boolean;
}

export interface EmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface EmailOptions {
  /** Optional intro text to show at the beginning of the email */
  introText?: string;
  /** All routes for the event (needed to calculate real guest counts) */
  allRoutes?: CategoryValue<Route>[];
}

/**
 * Extract time portion from a time string (handles both "18:00" and "2025-12-10T18:00:00" formats)
 */
function extractTime(time: string): string {
  // Check if it's an ISO timestamp
  if (time.includes('T')) {
    const timePart = time.split('T')[1];
    // Return HH:MM format (strip seconds if present)
    return timePart.substring(0, 5);
  }
  // Already in HH:MM format
  return time.substring(0, 5);
}

/**
 * Format time string for display (e.g., "18:00" -> "18:00 Uhr")
 */
function formatTime(time: string): string {
  return `${extractTime(time)} Uhr`;
}

/**
 * Format time range for display (e.g., "18:00 - 19:30 Uhr")
 */
function formatTimeRange(startTime: string, endTime: string): string {
  return `${extractTime(startTime)} - ${extractTime(endTime)} Uhr`;
}

/**
 * Service for generating and sending email notifications
 */
export class EmailService {
  /**
   * Generate email content for route publication
   */
  generateRouteEmail(
    eventMetadata: EventMetadata,
    route: CategoryValue<Route>,
    dinnerGroup: CategoryValue<DinnerGroup>,
    allDinnerGroups: CategoryValue<DinnerGroup>[],
    members: GroupMember[],
    options: EmailOptions = {},
  ): EmailContent {
    const groupMembers = members.filter((m) =>
      dinnerGroup.value.memberPersonIds.includes(m.personId),
    );

    // TODO: Get event name from group ID (would need to fetch from ChurchTools)
    const eventName = `Running Dinner Event`;

    const subject = `${eventName} - Deine Route`;

    // Find the stop where this group is hosting (their own meal)
    const ownMealStop = route.value.stops.find(
      (stop) => stop.hostDinnerGroupId === dinnerGroup.id,
    );

    // Generate HTML body with email-compatible inline styles
    let htmlBody = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <div style="background-color: #3b82f6; padding: 24px;">
          <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">🍽️ ${eventName}</h1>
        </div>
        <div style="padding: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
    `;

    // Add optional intro text
    if (options.introText) {
      htmlBody += `<p style="font-size: 16px; line-height: 1.5; color: #374151; margin-bottom: 20px;">${options.introText}</p>`;
    }

    htmlBody += `
      <h2 style="font-size: 18px; color: #1f2937; margin: 24px 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">👥 Deine Gruppe</h2>
      <ul style="padding-left: 0; list-style: none; margin: 0;">
    `;

    groupMembers.forEach((member) => {
      const name = `${member.person.firstName} ${member.person.lastName}`;
      const email = member.person.email || 'Keine E-Mail';
      const phone =
        member.person.phoneNumbers && member.person.phoneNumbers.length > 0
          ? member.person.phoneNumbers[0].phoneNumber
          : 'Keine Telefonnummer';

      htmlBody += `<li style="padding: 12px; background-color: #f9fafb; margin-bottom: 8px;"><strong style="color: #1f2937;">${name}</strong><br><span style="color: #6b7280; font-size: 14px;">📧 ${email}<br>📞 ${phone}</span></li>`;
    });

    htmlBody += `</ul>`;

    // Highlight the own hosted meal prominently
    if (ownMealStop) {
      const ownMealName =
        ownMealStop.meal === 'starter'
          ? 'Vorspeise'
          : ownMealStop.meal === 'mainCourse'
            ? 'Hauptgang'
            : 'Nachspeise';

      // Find visiting groups by checking all routes for groups that visit this host
      const visitingDinnerGroupIds: number[] = [];
      if (options.allRoutes) {
        options.allRoutes.forEach((otherRoute) => {
          // Skip our own route
          if (otherRoute.value.dinnerGroupId === dinnerGroup.id) return;

          // Check if this route has a stop at our group for our hosted meal
          const visitsUs = otherRoute.value.stops.some(
            (stop) =>
              stop.hostDinnerGroupId === dinnerGroup.id &&
              stop.meal === ownMealStop.meal,
          );
          if (visitsUs) {
            visitingDinnerGroupIds.push(otherRoute.value.dinnerGroupId);
          }
        });
      }

      // Get the visiting groups and their members
      const visitingGroups = allDinnerGroups.filter((g) =>
        visitingDinnerGroupIds.includes(g.id!),
      );
      const visitingMemberIds = visitingGroups.flatMap(
        (g) => g.value.memberPersonIds,
      );
      const visitingMembers = members.filter((m) =>
        visitingMemberIds.includes(m.personId),
      );

      const guestCount = visitingMembers.length;
      const groupCount = visitingGroups.length;

      // Get the host person's address for this group
      const ownHostPerson = members.find(
        (m) => m.personId === dinnerGroup.value.hostPersonId,
      );
      const ownHostAddress = ownHostPerson?.person.addresses?.[0]
        ? `${ownHostPerson.person.addresses[0].street || ''}, ${ownHostPerson.person.addresses[0].zip || ''} ${ownHostPerson.person.addresses[0].city || ''}`
        : 'Adresse nicht angegeben';
      const ownHostAddressHtml =
        ownHostAddress !== 'Adresse nicht angegeben'
          ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ownHostAddress)}" style="color: #2563eb; text-decoration: underline;">${ownHostAddress}</a>`
          : ownHostAddress;

      htmlBody += `
        <div style="background-color: #f0f7ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">🍽️ Ihr bereitet zu: ${ownMealName}</h3>
          <p style="margin-bottom: 0;">
            <strong>Zeit:</strong> ${formatTimeRange(ownMealStop.startTime, ownMealStop.endTime)}<br>
            <strong>Ort:</strong> ${ownHostAddressHtml}<br>
            <strong>Gäste:</strong> ${guestCount} Personen (${groupCount} Gruppen)
          </p>
      `;

      // Collect dietary restrictions and allergies from visiting guests (without names)
      const dietaryRestrictions: string[] = [];
      const allergies: string[] = [];

      visitingMembers.forEach((guest) => {
        if (guest.fields?.dietaryRestrictions) {
          dietaryRestrictions.push(guest.fields.dietaryRestrictions);
        }
        if (guest.fields?.allergyInfo) {
          allergies.push(guest.fields.allergyInfo);
        }
      });

      // Deduplicate and display
      const uniqueDietaryRestrictions = [...new Set(dietaryRestrictions)];
      const uniqueAllergies = [...new Set(allergies)];

      if (uniqueDietaryRestrictions.length > 0 || uniqueAllergies.length > 0) {
        htmlBody += `<div style="margin-top: 12px;"><strong style="color: #1e40af;">⚠️ Ernährungshinweise:</strong><ul style="margin: 8px 0 0 0; padding-left: 20px;">`;
        uniqueDietaryRestrictions.forEach((restriction) => {
          htmlBody += `<li style="color: #374151;">${restriction}</li>`;
        });
        uniqueAllergies.forEach((allergy) => {
          htmlBody += `<li style="color: #dc2626;">Allergie: ${allergy}</li>`;
        });
        htmlBody += `</ul></div>`;
      }

      htmlBody += `</div>`;
    }

    // Add route stops
    htmlBody += `<h2 style="font-size: 18px; color: #1f2937; margin: 24px 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">🗺️ Deine Route</h2>`;

    // Add full route link
    const fullRouteLink = generateFullRouteLink(
      route.value.stops,
      eventMetadata,
      allDinnerGroups,
      members,
    );
    if (fullRouteLink) {
      htmlBody += `
        <div style="margin-bottom: 20px; text-align: center;">
          <a href="${fullRouteLink}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; font-weight: bold; font-size: 14px;">
            📍 Gesamte Route in Google Maps öffnen
          </a>
        </div>
      `;
    }

    route.value.stops.forEach((stop, index) => {
      const hostGroup = allDinnerGroups.find(
        (g) => g.id === stop.hostDinnerGroupId,
      );
      if (!hostGroup) return;

      const isOwnMeal = hostGroup.id === dinnerGroup.id;

      const hostPerson = members.find(
        (m) => m.personId === hostGroup.value.hostPersonId,
      );
      const hostName = hostPerson
        ? `${hostPerson.person.firstName} ${hostPerson.person.lastName}`
        : 'Unbekannt';

      const hostAddress = hostPerson?.person.addresses?.[0]
        ? `${hostPerson.person.addresses[0].street || ''}, ${hostPerson.person.addresses[0].zip || ''} ${hostPerson.person.addresses[0].city || ''}`
        : 'Adresse nicht angegeben';

      const mealName =
        stop.meal === 'starter'
          ? 'Vorspeise'
          : stop.meal === 'mainCourse'
            ? 'Hauptgang'
            : 'Nachspeise';

      // Check if this is dessert at after party location
      const isDessertAtAfterParty =
        stop.meal === 'dessert' && eventMetadata.afterParty?.isDessertLocation;

      if (isOwnMeal) {
        // Own meal - just show time and that it's at home
        htmlBody += `
          <div style="padding: 16px; background-color: #f0fdf4; border-left: 4px solid #22c55e; margin-bottom: 12px;">
            <h4 style="margin: 0 0 8px 0; color: #166534; font-size: 16px;">${index + 1}. ${mealName} - ${formatTimeRange(stop.startTime, stop.endTime)}</h4>
            <p style="margin: 0; color: #15803d;">🏠 Bei euch zu Hause (siehe oben)</p>
          </div>
        `;
      } else if (isDessertAtAfterParty) {
        // Dessert is at after party location for everyone
        const encodedAfterPartyAddress = encodeURIComponent(
          eventMetadata.afterParty!.location,
        );
        htmlBody += `
          <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; margin-bottom: 12px;">
            <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 16px;">🎉 ${index + 1}. ${mealName} - ${formatTimeRange(stop.startTime, stop.endTime)}</h4>
            <p style="margin: 0; color: #78350f;">
              <strong>Ort:</strong> <a href="https://www.google.com/maps/search/?api=1&query=${encodedAfterPartyAddress}" style="color: #b45309;">${eventMetadata.afterParty!.location}</a><br>
              <em>Alle Gruppen treffen sich zum Nachtisch am After Party Ort!</em>
            </p>
          </div>
        `;
      } else {
        // Standard home-based meal (visiting another group)
        const addressHtml =
          hostAddress !== 'Adresse nicht angegeben'
            ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hostAddress)}" style="color: #2563eb; text-decoration: underline;">${hostAddress}</a>`
            : hostAddress;

        htmlBody += `
          <div style="padding: 16px; background-color: #f9fafb; border-left: 4px solid #6b7280; margin-bottom: 12px;">
            <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">${index + 1}. ${mealName} - ${formatTimeRange(stop.startTime, stop.endTime)}</h4>
            <p style="margin: 0; color: #4b5563;">
              <strong>Gastgeber:</strong> ${hostName}<br>
              <strong>Adresse:</strong> ${addressHtml}
            </p>
          </div>
        `;
      }
    });

    // Add after party info if available
    if (eventMetadata.afterParty) {
      const encodedAfterPartyLocation = encodeURIComponent(
        eventMetadata.afterParty.location,
      );
      htmlBody += `
        <div style="margin-top: 24px; padding: 20px; background-color: #fef3c7; text-align: center;">
          <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 20px;">🎉 After Party</h3>
          <p style="margin: 0; color: #78350f; font-size: 16px;">
            <strong>Zeit:</strong> ${formatTime(eventMetadata.afterParty.time)}<br>
            <strong>Ort:</strong> <a href="https://www.google.com/maps/search/?api=1&query=${encodedAfterPartyLocation}" style="color: #b45309;">${eventMetadata.afterParty.location}</a>
      `;
      if (eventMetadata.afterParty.description) {
        htmlBody += `<br><em>${eventMetadata.afterParty.description}</em>`;
      }
      htmlBody += `</p></div>`;
    }

    // Close wrapper divs
    htmlBody += `
        </div>
      </div>
    `;

    // Generate plain text version
    let textBody = `${eventName}\n\n`;

    // Add optional intro text
    if (options.introText) {
      textBody += `${options.introText}\n\n`;
    }

    textBody += `Deine Gruppe:\n`;
    groupMembers.forEach((member) => {
      const name = `${member.person.firstName} ${member.person.lastName}`;
      const email = member.person.email || 'Keine E-Mail';
      const phone =
        member.person.phoneNumbers && member.person.phoneNumbers.length > 0
          ? member.person.phoneNumbers[0].phoneNumber
          : 'Keine Telefonnummer';
      textBody += `- ${name}\n  E-Mail: ${email}\n  Telefon: ${phone}\n`;
    });

    // Highlight own meal in plain text
    if (ownMealStop) {
      const ownMealName =
        ownMealStop.meal === 'starter'
          ? 'Vorspeise'
          : ownMealStop.meal === 'mainCourse'
            ? 'Hauptgang'
            : 'Nachspeise';

      // Find visiting groups by checking all routes
      const visitingDinnerGroupIds: number[] = [];
      if (options.allRoutes) {
        options.allRoutes.forEach((otherRoute) => {
          if (otherRoute.value.dinnerGroupId === dinnerGroup.id) return;
          const visitsUs = otherRoute.value.stops.some(
            (stop) =>
              stop.hostDinnerGroupId === dinnerGroup.id &&
              stop.meal === ownMealStop.meal,
          );
          if (visitsUs) {
            visitingDinnerGroupIds.push(otherRoute.value.dinnerGroupId);
          }
        });
      }

      const visitingGroups = allDinnerGroups.filter((g) =>
        visitingDinnerGroupIds.includes(g.id!),
      );
      const visitingMemberIds = visitingGroups.flatMap(
        (g) => g.value.memberPersonIds,
      );
      const visitingMembers = members.filter((m) =>
        visitingMemberIds.includes(m.personId),
      );

      const guestCount = visitingMembers.length;
      const groupCount = visitingGroups.length;

      // Get the host person's address for this group
      const ownHostPersonText = members.find(
        (m) => m.personId === dinnerGroup.value.hostPersonId,
      );
      const ownHostAddressText = ownHostPersonText?.person.addresses?.[0]
        ? `${ownHostPersonText.person.addresses[0].street || ''}, ${ownHostPersonText.person.addresses[0].zip || ''} ${ownHostPersonText.person.addresses[0].city || ''}`
        : 'Adresse nicht angegeben';

      textBody += `\n========================================\n`;
      textBody += `🍽️ IHR BEREITET ZU: ${ownMealName.toUpperCase()}\n`;
      textBody += `Zeit: ${formatTimeRange(ownMealStop.startTime, ownMealStop.endTime)}\n`;
      textBody += `Ort: ${ownHostAddressText}\n`;
      textBody += `Gäste: ${guestCount} Personen (${groupCount} Gruppen)\n`;

      // Collect dietary restrictions and allergies (without names)
      const dietaryRestrictions: string[] = [];
      const allergies: string[] = [];

      visitingMembers.forEach((guest) => {
        if (guest.fields?.dietaryRestrictions) {
          dietaryRestrictions.push(guest.fields.dietaryRestrictions);
        }
        if (guest.fields?.allergyInfo) {
          allergies.push(guest.fields.allergyInfo);
        }
      });

      const uniqueDietaryRestrictions = [...new Set(dietaryRestrictions)];
      const uniqueAllergies = [...new Set(allergies)];

      if (uniqueDietaryRestrictions.length > 0 || uniqueAllergies.length > 0) {
        textBody += `\nErnährungshinweise:\n`;
        uniqueDietaryRestrictions.forEach((restriction) => {
          textBody += `  - ${restriction}\n`;
        });
        uniqueAllergies.forEach((allergy) => {
          textBody += `  - Allergie: ${allergy}\n`;
        });
      }

      textBody += `========================================\n`;
    }

    textBody += `\nDeine Route:\n`;

    // Add full route link to plain text
    const fullRouteLinkText = generateFullRouteLink(
      route.value.stops,
      eventMetadata,
      allDinnerGroups,
      members,
    );
    if (fullRouteLinkText) {
      textBody += `\n🗺️ Route in Google Maps:\n${fullRouteLinkText}\n`;
    }
    route.value.stops.forEach((stop, index) => {
      const hostGroup = allDinnerGroups.find(
        (g) => g.id === stop.hostDinnerGroupId,
      );
      if (!hostGroup) return;

      const isOwnMeal = hostGroup.id === dinnerGroup.id;

      const hostPerson = members.find(
        (m) => m.personId === hostGroup.value.hostPersonId,
      );
      const hostName = hostPerson
        ? `${hostPerson.person.firstName} ${hostPerson.person.lastName}`
        : 'Unbekannt';
      const hostAddress = hostPerson?.person.addresses?.[0]
        ? `${hostPerson.person.addresses[0].street || ''}, ${hostPerson.person.addresses[0].zip || ''} ${hostPerson.person.addresses[0].city || ''}`
        : 'Adresse nicht angegeben';

      const mealName =
        stop.meal === 'starter'
          ? 'Vorspeise'
          : stop.meal === 'mainCourse'
            ? 'Hauptgang'
            : 'Nachspeise';

      // Check if this is dessert at after party location
      const isDessertAtAfterParty =
        stop.meal === 'dessert' && eventMetadata.afterParty?.isDessertLocation;

      textBody += `\n${index + 1}. ${mealName} - ${formatTimeRange(stop.startTime, stop.endTime)}\n`;

      if (isOwnMeal) {
        textBody += `   Bei euch zu Hause (siehe oben)\n`;
      } else if (isDessertAtAfterParty) {
        // Dessert is at after party location for everyone
        textBody += `   Ort: ${eventMetadata.afterParty!.location} (After Party)\n`;
        textBody += `   Alle Gruppen treffen sich zum Nachtisch am After Party Ort!\n`;
      } else {
        // Standard home-based meal
        textBody += `   Gastgeber: ${hostName}\n`;
        textBody += `   Adresse: ${hostAddress}\n`;
      }
    });

    if (eventMetadata.afterParty) {
      textBody += `\nAfter Party:\n`;
      textBody += `Zeit: ${formatTime(eventMetadata.afterParty.time)}\n`;
      textBody += `Ort: ${eventMetadata.afterParty.location}\n`;
      if (eventMetadata.afterParty.description) {
        textBody += `${eventMetadata.afterParty.description}\n`;
      }
    }

    return {
      subject,
      htmlBody,
      textBody,
    };
  }

  /**
   * Get CSRF token required for AJAX API calls
   */
  private async getCsrfToken(): Promise<string> {
    const response = await churchtoolsClient.get<{ data: string }>(
      '/csrftoken',
    );
    return response.data;
  }

  /**
   * Send email via ChurchTools internal AJAX API
   * Uses the legacy `sendEMailToPersonIds` function which allows sending
   * emails directly to person IDs without requiring an event.
   *
   * In mock mode: logs email content to console
   * Otherwise: sends via ChurchTools AJAX API
   *
   * @param recipientPersonIds - Array of ChurchTools person IDs to send to
   * @param subject - Email subject line
   * @param body - HTML email body
   * @param groupId - Optional group ID for context (appears in email headers)
   * @returns Result of the email operation
   */
  async sendEmail(
    recipientPersonIds: number[],
    subject: string,
    body: string,
    groupId?: number,
  ): Promise<EmailSendResult> {
    if (mockEmailSending()) {
      console.log('=== EMAIL TO SEND (Mock Mode) ===');
      console.log('Recipients (Person IDs):', recipientPersonIds);
      console.log('Subject:', subject);
      console.log('Body:', body);
      console.log('=========================================');

      return {
        success: true,
        sentCount: recipientPersonIds.length,
        failedPersonIds: [],
        wasSimulated: true,
      };
    }

    // Production mode: send via ChurchTools AJAX API
    try {
      // Get CSRF token first (required for AJAX POST requests)
      const csrfToken = await this.getCsrfToken();

      // ChurchTools uses a legacy AJAX endpoint for sending emails to persons
      // We need to make a raw fetch call since churchtoolsClient adds /api prefix
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/?q=churchhome/ajax`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken,
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({
          func: 'sendEMailToPersonIds',
          ids: recipientPersonIds.join(','),
          betreff: subject,
          inhalt: body,
          attachments: '',
          domain_id: null,
          group_id: groupId ?? null,
          template_id: null,
        }),
      });

      interface AjaxResponse {
        status: 'success' | 'error';
        data: unknown;
        message?: string;
      }

      const result: AjaxResponse = await response.json();

      if (result?.status === 'success') {
        console.log(
          `Email sent via ChurchTools: ${recipientPersonIds.length} recipients`,
        );

        return {
          success: true,
          sentCount: recipientPersonIds.length,
          failedPersonIds: [],
          wasSimulated: false,
        };
      } else {
        const errorMessage =
          result?.message ?? 'Unknown error from ChurchTools';
        console.error('ChurchTools email sending failed:', errorMessage);

        return {
          success: false,
          sentCount: 0,
          failedPersonIds: recipientPersonIds,
          error: errorMessage,
          wasSimulated: false,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to send email via ChurchTools:', errorMessage);

      return {
        success: false,
        sentCount: 0,
        failedPersonIds: recipientPersonIds,
        error: errorMessage,
        wasSimulated: false,
      };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
