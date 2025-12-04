import type { CategoryValue } from '@churchtools-extensions/persistance';
import type {
  EventMetadata,
  DinnerGroup,
  RouteStop,
  GroupMember,
} from '@/types/models';

/**
 * Get the address for a route stop
 */
function getStopAddress(
  stop: RouteStop,
  eventMetadata: EventMetadata,
  dinnerGroups: CategoryValue<DinnerGroup>[],
  members: GroupMember[],
): string | null {
  // Check if this is dessert at after party location
  if (stop.meal === 'dessert' && eventMetadata.afterParty?.isDessertLocation) {
    return eventMetadata.afterParty.location;
  }

  // Get host address
  const hostGroup = dinnerGroups.find((g) => g.id === stop.hostDinnerGroupId);
  if (!hostGroup?.value.hostPersonId) return null;

  const host = members.find((m) => m.personId === hostGroup.value.hostPersonId);
  if (!host?.person.addresses?.[0]) return null;

  const addr = host.person.addresses[0];
  return [addr.street, addr.zip, addr.city].filter(Boolean).join(', ');
}

/**
 * Generate a Google Maps directions URL with multiple waypoints for the full route
 */
export function generateFullRouteLink(
  stops: RouteStop[],
  eventMetadata: EventMetadata,
  dinnerGroups: CategoryValue<DinnerGroup>[],
  members: GroupMember[],
): string | null {
  const addresses = stops
    .map((stop) => getStopAddress(stop, eventMetadata, dinnerGroups, members))
    .filter((addr): addr is string => addr !== null && addr.length > 0);

  if (addresses.length < 2) return null;

  // Google Maps URL format: origin, destination, and waypoints in between
  const origin = encodeURIComponent(addresses[0]);
  const destination = encodeURIComponent(addresses[addresses.length - 1]);

  // Waypoints are the stops in between (if any)
  const waypointAddresses = addresses.slice(1, -1);
  const waypointsParam =
    waypointAddresses.length > 0
      ? `&waypoints=${waypointAddresses.map(encodeURIComponent).join('%7C')}`
      : '';

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=walking`;
}

/**
 * Generate a Google Maps search URL for a single address
 */
export function generateAddressLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
