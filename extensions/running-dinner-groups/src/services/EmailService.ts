import type {
  EventMetadata,
  DinnerGroup,
  Route,
  GroupMember,
} from '@/types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import { generateFullRouteLink } from '@/utils/googleMaps';

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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">🍽️ ${eventName}</h1>
        </div>
        <div style="padding: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    `;

    // Add optional intro text
    if (options.introText) {
      htmlBody += `<p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 20px;">${options.introText}</p>`;
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

      htmlBody += `<li style="padding: 12px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 8px;"><strong style="color: #1f2937;">${name}</strong><br><span style="color: #6b7280; font-size: 14px;">📧 ${email}<br>📞 ${phone}</span></li>`;
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

      htmlBody += `
        <div style="background-color: #f0f7ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">🍽️ Ihr bereitet zu: ${ownMealName}</h3>
          <p style="margin-bottom: 0;">
            <strong>Zeit:</strong> ${formatTimeRange(ownMealStop.startTime, ownMealStop.endTime)}<br>
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
          <a href="${fullRouteLink}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
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
          <div style="padding: 16px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 0 8px 8px 0; margin-bottom: 12px;">
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
          <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; margin-bottom: 12px;">
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
          <div style="padding: 16px; background-color: #f9fafb; border-left: 4px solid #6b7280; border-radius: 0 8px 8px 0; margin-bottom: 12px;">
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
        <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; text-align: center;">
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

      textBody += `\n========================================\n`;
      textBody += `🍽️ IHR BEREITET ZU: ${ownMealName.toUpperCase()}\n`;
      textBody += `Zeit: ${formatTimeRange(ownMealStop.startTime, ownMealStop.endTime)}\n`;
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
   * Send email via ChurchTools email API
   * For MVP: console.log email content (actual sending to be implemented)
   */
  async sendEmail(
    recipientPersonIds: number[],
    subject: string,
    body: string,
  ): Promise<void> {
    // TODO: Implement actual email sending via ChurchTools API
    // For now, just log the email content
    console.log('=== EMAIL TO SEND ===');
    console.log('Recipients (Person IDs):', recipientPersonIds);
    console.log('Subject:', subject);
    console.log('Body:', body);
    console.log('=====================');

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// Export singleton instance
export const emailService = new EmailService();
