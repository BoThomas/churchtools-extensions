import { churchtoolsClient } from '@churchtools/churchtools-client';

/**
 * Address data structure
 */
interface GroupAddress {
  id?: number;
  street?: string;
  addition?: string;
  zip?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Service for managing group addresses via ChurchTools API
 * This replaces the deprecated /groups/{groupId}/places endpoint
 * with the new /api/addresses/group/{groupId} endpoint
 */
export class AddressService {
  /**
   * Get addresses for a group
   * @param groupId - The ChurchTools group ID
   */
  async getGroupAddresses(groupId: number): Promise<GroupAddress[]> {
    try {
      const response = await churchtoolsClient.get(
        `/addresses/group/${groupId}`,
      );
      return Array.isArray(response)
        ? (response as GroupAddress[])
        : (response as { data: GroupAddress[] }).data || [];
    } catch (error) {
      console.error('Failed to get group addresses:', error);
      return [];
    }
  }

  /**
   * Set the after-party location for a group
   * @param groupId - The ChurchTools group ID
   * @param address - The address data
   */
  async setAfterPartyLocation(
    groupId: number,
    address: {
      street?: string;
      addition?: string;
      zip?: string;
      city?: string;
      country?: string;
    },
  ): Promise<GroupAddress | null> {
    try {
      // First check if an address already exists
      const existingAddresses = await this.getGroupAddresses(groupId);

      if (existingAddresses.length > 0) {
        // Update existing address
        const existingId = existingAddresses[0].id;
        if (existingId) {
          const response = (await churchtoolsClient.patch(
            `/addresses/${existingId}`,
            address,
          )) as GroupAddress | { data: GroupAddress };

          const result = 'data' in response ? response.data : response;
          console.log('Group address updated:', groupId, result);
          return result;
        }
      }

      // Create new address for the group
      const response = (await churchtoolsClient.post(
        `/addresses/group/${groupId}`,
        address,
      )) as GroupAddress | { data: GroupAddress };

      const result = 'data' in response ? response.data : response;
      console.log('Group address created:', groupId, result);
      return result;
    } catch (error) {
      console.error('Failed to set after-party location:', error);
      throw new Error('Failed to set after-party location');
    }
  }

  /**
   * Remove all addresses from a group
   * @param groupId - The ChurchTools group ID
   */
  async removeGroupAddresses(groupId: number): Promise<void> {
    try {
      const addresses = await this.getGroupAddresses(groupId);

      for (const address of addresses) {
        if (address.id) {
          await churchtoolsClient.deleteApi(`/addresses/${address.id}`);
        }
      }

      console.log('Group addresses removed:', groupId);
    } catch (error) {
      console.error('Failed to remove group addresses:', error);
      throw new Error('Failed to remove group addresses');
    }
  }

  /**
   * Parse an address string into components
   * Attempts to extract street, zip, and city from a single string
   * @param addressString - A single-line address like "Hauptstraße 123, 12345 Berlin"
   */
  parseAddressString(addressString: string): Partial<GroupAddress> {
    const result: Partial<GroupAddress> = {};

    // Try to parse common German address formats
    // Format: "Street Name 123, 12345 City"
    const zipCityMatch = addressString.match(/,?\s*(\d{5})\s+(.+)$/);
    if (zipCityMatch) {
      result.zip = zipCityMatch[1];
      result.city = zipCityMatch[2].trim();
      result.street = addressString.replace(zipCityMatch[0], '').trim();
    } else {
      // If no clear structure, put everything in street
      result.street = addressString.trim();
    }

    return result;
  }

  /**
   * Format an address for display
   * @param address - The address object
   */
  formatAddress(address: GroupAddress): string {
    const parts: string[] = [];

    if (address.street) {
      parts.push(address.street);
    }
    if (address.addition) {
      parts.push(address.addition);
    }
    if (address.zip || address.city) {
      const location = [address.zip, address.city].filter(Boolean).join(' ');
      parts.push(location);
    }
    if (address.country) {
      parts.push(address.country);
    }

    return parts.join(', ');
  }
}

// Export singleton instance
export const addressService = new AddressService();
