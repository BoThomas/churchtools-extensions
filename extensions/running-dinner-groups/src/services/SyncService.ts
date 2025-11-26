import { useChurchtoolsStore } from '@/stores/churchtools';
import { useEventMetadataStore } from '@/stores/eventMetadata';
import { useDinnerGroupStore } from '@/stores/dinnerGroup';
import { useRouteStore } from '@/stores/route';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type { EventMetadata } from '@/types/models';

/**
 * Result of a sync operation
 */
export interface SyncResult {
  orphanedEventsDeleted: number;
  orphanedDinnerGroupsDeleted: number;
  orphanedRoutesDeleted: number;
  errors: string[];
}

/**
 * Service for synchronizing ChurchTools group data with KV store data
 *
 * Handles:
 * - Detecting deleted CT groups and cleaning up orphaned KV data
 * - Verifying data integrity between CT and KV store
 */
export class SyncService {
  private churchtoolsStore = useChurchtoolsStore();
  private eventMetadataStore = useEventMetadataStore();
  private dinnerGroupStore = useDinnerGroupStore();
  private routeStore = useRouteStore();

  /**
   * Perform a full sync check on extension load
   * Detects CT groups that have been deleted externally and cleans up orphaned KV data
   */
  async syncOnLoad(): Promise<SyncResult> {
    const result: SyncResult = {
      orphanedEventsDeleted: 0,
      orphanedDinnerGroupsDeleted: 0,
      orphanedRoutesDeleted: 0,
      errors: [],
    };

    try {
      // 1. Fetch all data
      await Promise.all([
        this.eventMetadataStore.fetchAll(),
        this.dinnerGroupStore.fetchAll(),
        this.routeStore.fetchAll(),
      ]);

      // 2. Get the parent group
      const parentGroup = await this.churchtoolsStore.getParentGroup();
      if (!parentGroup) {
        // No parent group means no events - but we might have orphaned KV data
        result.errors.push('Parent group not found');
        return result;
      }

      // 3. Get all child groups (actual CT events)
      const childGroups = await this.churchtoolsStore.getChildGroups(
        parentGroup.id,
      );
      const existingGroupIds = new Set(childGroups.map((g) => g.id));

      // 4. Find orphaned event metadata (KV entries for deleted CT groups)
      const events = this.eventMetadataStore.events;
      const orphanedEvents = events.filter(
        (event) => !existingGroupIds.has(event.value.groupId),
      );

      // 5. Clean up orphaned event metadata and related data
      for (const orphanedEvent of orphanedEvents) {
        try {
          await this.cleanupOrphanedEvent(orphanedEvent);
          result.orphanedEventsDeleted++;
        } catch (error) {
          result.errors.push(
            `Failed to cleanup orphaned event ${orphanedEvent.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // 6. Find orphaned dinner groups (groups for deleted events)
      const validEventIds = new Set(
        events
          .filter((e) => existingGroupIds.has(e.value.groupId))
          .map((e) => e.id),
      );

      const dinnerGroups = this.dinnerGroupStore.dinnerGroups;
      const orphanedDinnerGroupEventIds = new Set(
        dinnerGroups
          .filter((dg) => !validEventIds.has(dg.value.eventMetadataId))
          .map((dg) => dg.value.eventMetadataId),
      );

      for (const eventId of orphanedDinnerGroupEventIds) {
        try {
          await this.dinnerGroupStore.deleteByEventId(eventId);
          result.orphanedDinnerGroupsDeleted++;
        } catch (error) {
          result.errors.push(
            `Failed to cleanup orphaned dinner groups for event ${eventId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // 7. Find orphaned routes
      const routes = this.routeStore.routes;
      const orphanedRouteEventIds = new Set(
        routes
          .filter((r) => !validEventIds.has(r.value.eventMetadataId))
          .map((r) => r.value.eventMetadataId),
      );

      for (const eventId of orphanedRouteEventIds) {
        try {
          await this.routeStore.deleteByEventId(eventId);
          result.orphanedRoutesDeleted++;
        } catch (error) {
          result.errors.push(
            `Failed to cleanup orphaned routes for event ${eventId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      console.log('Sync completed:', result);
      return result;
    } catch (error) {
      result.errors.push(
        `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      console.error('Sync failed:', error);
      return result;
    }
  }

  /**
   * Clean up all KV data associated with an orphaned event
   */
  private async cleanupOrphanedEvent(
    event: CategoryValue<EventMetadata>,
  ): Promise<void> {
    const eventId = event.id;

    // Delete associated dinner groups
    await this.dinnerGroupStore.deleteByEventId(eventId);

    // Delete associated routes
    await this.routeStore.deleteByEventId(eventId);

    // Delete the event metadata itself
    await this.eventMetadataStore.remove(eventId);

    console.log('Cleaned up orphaned event:', eventId);
  }

  /**
   * Delete an event and all its associated data (CT group + KV data)
   * Use this when deleting an event from the extension UI
   */
  async deleteEventComplete(eventMetadataId: number): Promise<void> {
    // Get the event metadata
    const events = this.eventMetadataStore.events;
    const event = events.find((e) => e.id === eventMetadataId);

    if (!event) {
      throw new Error('Event not found');
    }

    const groupId = event.value.groupId;

    // 1. Delete the CT group first (source of truth)
    try {
      await this.churchtoolsStore.deleteGroup(groupId);
    } catch (error) {
      // Group might already be deleted externally
      console.warn('CT group may already be deleted:', error);
    }

    // 2. Delete associated dinner groups
    await this.dinnerGroupStore.deleteByEventId(eventMetadataId);

    // 3. Delete associated routes
    await this.routeStore.deleteByEventId(eventMetadataId);

    // 4. Delete the event metadata
    await this.eventMetadataStore.remove(eventMetadataId);

    console.log('Event deleted completely:', eventMetadataId, groupId);
  }

  /**
   * Archive an event (set CT group status to archived)
   * KV data is preserved for historical records
   */
  async archiveEvent(eventMetadataId: number): Promise<void> {
    const events = this.eventMetadataStore.events;
    const event = events.find((e) => e.id === eventMetadataId);

    if (!event) {
      throw new Error('Event not found');
    }

    // Set CT group status to archived (groupStatusId = 3)
    await this.churchtoolsStore.updateGroup(event.value.groupId, {
      groupStatusId: 3, // archived
    });

    // Update event metadata status to completed
    await this.eventMetadataStore.update(eventMetadataId, {
      status: 'completed',
    });

    console.log('Event archived:', eventMetadataId);
  }

  /**
   * Restore an archived event (set CT group status back to active)
   */
  async restoreEvent(eventMetadataId: number): Promise<void> {
    const events = this.eventMetadataStore.events;
    const event = events.find((e) => e.id === eventMetadataId);

    if (!event) {
      throw new Error('Event not found');
    }

    // Set CT group status back to active (groupStatusId = 1)
    await this.churchtoolsStore.updateGroup(event.value.groupId, {
      groupStatusId: 1, // active
    });

    // Restore event metadata status based on current state
    // Determine status based on what data exists
    const dinnerGroups = this.dinnerGroupStore.dinnerGroups.filter(
      (dg) => dg.value.eventMetadataId === eventMetadataId,
    );
    const routes = this.routeStore.routes.filter(
      (r) => r.value.eventMetadataId === eventMetadataId,
    );

    let newStatus: EventMetadata['status'] = 'active';
    if (routes.length > 0) {
      newStatus =
        event.value.status === 'notifications-sent'
          ? 'notifications-sent'
          : 'routes-assigned';
    } else if (dinnerGroups.length > 0) {
      newStatus = 'groups-created';
    }

    await this.eventMetadataStore.update(eventMetadataId, {
      status: newStatus,
    });

    console.log('Event restored:', eventMetadataId, 'status:', newStatus);
  }

  /**
   * Check if an event's CT group still exists
   */
  async checkEventGroupExists(eventMetadataId: number): Promise<boolean> {
    const events = this.eventMetadataStore.events;
    const event = events.find((e) => e.id === eventMetadataId);

    if (!event) {
      return false;
    }

    const group = await this.churchtoolsStore.getGroup(event.value.groupId);
    return group !== null;
  }

  /**
   * Get the CT group status for an event
   */
  async getEventGroupStatus(
    eventMetadataId: number,
  ): Promise<{ statusId: number; statusName: string } | null> {
    const events = this.eventMetadataStore.events;
    const event = events.find((e) => e.id === eventMetadataId);

    if (!event) {
      return null;
    }

    const group = await this.churchtoolsStore.getGroup(event.value.groupId);
    if (!group) {
      return null;
    }

    // Map status ID to name
    const statusNames: Record<number, string> = {
      1: 'active',
      2: 'pending',
      3: 'archived',
      4: 'finished',
    };

    return {
      statusId: group.groupStatusId,
      statusName: statusNames[group.groupStatusId] || 'unknown',
    };
  }
}

// Export singleton instance
export const syncService = new SyncService();
