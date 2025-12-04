# Running Dinner Groups Extension - Implementation Plan

## Implementation Status

**Last Updated**: November 30, 2025

### Quick Summary

| Category                  | Status                                                                     |
| ------------------------- | -------------------------------------------------------------------------- |
| Core Infrastructure       | ✅ Complete                                                                |
| Pinia Stores              | ✅ Complete (4/4)                                                          |
| Core Services             | ✅ Complete (7/7)                                                          |
| Vue Components            | ✅ Complete (9/9 core components)                                          |
| Main Views                | ✅ Complete (2/2)                                                          |
| **Service Integration**   | ⚠️ Pending (RoutineService, AddressService, SyncService not wired into UI) |
| **Additional Components** | ⚠️ Pending (EmailPreview.vue)                                              |
| **Testing**               | ⚠️ Pending                                                                 |

### ✅ Completed Components

#### Core Infrastructure

- [x] TypeScript configuration with path mappings (@/_ → ./src/_)
- [x] Project structure and folder organization
- [x] Type definitions (`src/types/models.ts`) with Zod schemas
  - EventMetadata, DinnerGroup, Route, RouteStop
  - GroupMember, Group, Person (ChurchTools types)
  - All types properly validated with Zod

#### Pinia Stores (State Management)

- [x] `churchtools.ts` - ChurchTools API wrapper
  - Parent/child group operations
  - Group member fetching
  - Person lookups
  - Group settings management
- [x] `eventMetadata.ts` - Event metadata CRUD
  - Full CRUD operations with KV store
  - Automatic timestamp management
- [x] `dinnerGroup.ts` - Dinner group CRUD
  - Batch creation support
  - Event-scoped queries
  - Full CRUD operations
- [x] `route.ts` - Route CRUD
  - Batch creation support
  - Event and group scoped queries
  - Full CRUD operations

#### Services (Business Logic)

- [x] `GroupConfigService.ts` - ChurchTools group configuration
  - Parent group creation with leader assignment
  - Child group creation and configuration
  - Custom field management
  - Group settings updates
- [x] `GroupingService.ts` - Dinner group creation algorithm
  - Full port from running-dinner extension
  - Preference graph building (mutual/one-sided)
  - Greedy grouping algorithm
  - Meal assignment with preferences
  - Preference mismatch detection
- [x] `RoutingService.ts` - Route assignment algorithm
  - **Full port from running-dinner extension**
  - Advanced backtracking with state restoration
  - Capacity checking (3 groups per location)
  - Scoring system for optimization
  - Detailed error diagnostics
  - Relaxed mode for < 9 groups
- [x] `EmailService.ts` - Email generation and sending
  - Route email generation (HTML + plain text)
  - Personalized content with dietary info
  - Batch sending support
  - Console fallback for testing

#### Vue Components

- [x] `ParentGroupSetup.vue` - Parent group creation wizard
  - Group existence checking
  - Leader/co-leader selection
  - Group creation workflow
- [x] `EventCreator.vue` - Event creation modal
  - Complete form with validation
  - Menu timing configuration
  - **Partner preferences toggle** (configurable by organizer)
  - After party support
  - Integration with GroupConfigService
- [x] `EventCard.vue` - Event display card
  - CT group status badge (Draft/Active/Finished/Archived)
  - Extension workflow status badge
  - Member count with waitlist indicator
  - Registration open/closed status
  - Actions menu (Open in CT, Toggle Registration, Archive, Delete)
- [x] `MemberList.vue` - Group member list with filters
  - DataTable with search and status filtering
  - Columns: Name, Status, Meal Preference, Dietary restrictions, Contact, Registration date
  - Copy-to-clipboard for contact info
  - Active/Waitlist stats
- [x] `EventDetail.vue` - Full event detail modal
  - Tabs: Overview, Members, Dinner Groups, Routes
  - Event info, menu times, after party display
  - Quick actions (Open in CT, Toggle Registration)
  - Integration with all sub-components
- [x] `DinnerGroupBuilder.vue` - Dinner group creation UI
  - Stats (active members, groups created, unassigned)
  - Create Groups / Save / Reset actions
  - Grid display of dinner group cards
  - Add unassigned members to groups dialog
  - Warnings display
- [x] `DinnerGroupCard.vue` - Individual dinner group display
  - Group number and meal assignment badge
  - Member list with host indicator
  - Host address display
  - Dietary restrictions summary
  - Editable actions (set host, remove member, delete group)
- [x] `RouteAssignment.vue` - Route assignment UI
  - Stats (groups, routes, notification status)
  - Assign Routes / Save / Send Notifications actions
  - Route cards grid display
  - Warnings display
- [x] `RouteCard.vue` - Individual route display
  - 3 meal stops with time and location
  - Google Maps links
  - Host info and "Hosting" indicator
  - After party info

#### Main Views

- [x] `OrganizerView.vue` - Main dashboard
  - Event list with EventCard grid
  - Member counts per event
  - Archive/delete/toggle registration handlers
  - EventDetail dialog integration
  - Full data loading with member cache
- [x] `SettingsView.vue` - Extension info and how-it-works guide
  - Extension version/build info display
  - How it works documentation
  - Key features list

#### Additional Services (Implemented, Pending Integration)

- [x] `RoutineService.ts` - ChurchTools Routines management
  - Create routines for waitlist notifications (`createWaitlistPromotionRoutine`)
  - Welcome email automation (`createWelcomeRoutine`)
  - Late cancellation alerts (`createLateWithdrawalRoutine`)
  - API: POST/PATCH/GET `/api/routines`
  - Routine management (list, delete, enable/disable)
  - Email placeholder fetching
  - **⚠️ Not yet integrated into EventCreator or EventDetail**
- [x] `AddressService.ts` - Group address management
  - After-party location storage via `/api/addresses/group/{groupId}`
  - Replaces deprecated places API
  - Address parsing and formatting utilities
  - **⚠️ Not yet integrated into EventCreator for after-party address**
- [x] `SyncService.ts` - CT/KV data synchronization
  - Detect deleted CT groups on extension load (`syncOnLoad`)
  - Clean up orphaned KV data (events, dinner groups, routes)
  - Complete event deletion (`deleteEventComplete`)
  - Archive/restore events (`archiveEvent`, `restoreEvent`)
  - **⚠️ Not yet integrated into OrganizerView (syncOnLoad not called)**

### 🚧 In Progress / TODO

#### Service Integration Tasks

- [ ] **Integrate RoutineService into EventCreator.vue**
  - Call `createWelcomeRoutine()` after child group creation
  - Call `createWaitlistPromotionRoutine()` if waitlist enabled
  - Handle errors gracefully (routine creation failure shouldn't block event creation)
- [ ] **Integrate AddressService into EventCreator.vue**
  - Call `setAfterPartyLocation()` when after-party address is provided
- [ ] **Integrate SyncService into OrganizerView.vue**
  - Call `syncOnLoad()` during initial data loading
  - Display sync results (orphaned data cleaned up)
  - Use `deleteEventComplete()` instead of manual deletion
  - Use `archiveEvent()`/`restoreEvent()` for archive functionality
- [ ] **Implement Group & Route Change Management in DinnerGroupBuilder.vue**
  - Block group creation/deletion when routes exist (prompt to reset routes first)
  - On group reset, also delete routes and set status to `groups-created`
  - Add post-notification confirmation dialog showing affected participants
  - Compute affected hosts from route data for the confirmation dialog

#### Vue Components (Remaining)

- [ ] `EmailPreview.vue` - Email preview and sending UI
  - Preview generated emails before sending
  - Batch sending with progress indicator
  - Send/cancel actions
- [ ] `EventSettings.vue` - **FUTURE** Event settings management
  - Edit registration dates after creation
  - Waitlist settings modification
  - Routine configuration UI

---

## Overview

This document outlines the complete implementation plan for the **Running Dinner Groups** extension for ChurchTools. This extension takes a ChurchTools-native approach by leveraging the built-in **Group Management** system for participant registration and data collection, while providing organizers with powerful automation tools for group creation, meal routing, and communication.

## Key Architectural Decisions

### ChurchTools Group Integration

The extension uses a **hierarchical group structure**:

1. **Parent Group**: "Running Dinner" (permanent container group)
2. **Child Groups**: Individual events (e.g., "Running Dinner - December 2025")
   - Each child group represents one running dinner event
   - Group members = Event participants
   - Custom group-member fields store running dinner specific data

### Data Flow

```
Organizer Flow (Extension UI) Part 1:
1. Organizer creates child group → Extension auto-configures settings and adds it to the parent. if no parent group exists, it creates one.

Participant Flow (ChurchTools Native):
1. Participant joins group via ChurchTools → Fills custom fields (meal preference, etc.)
2. ChurchTools manages: member list, contact info, addresses, waitlist

Organizer Flow (Extension UI) Part 2:
1. View all events (child groups)
2. Close registration (lock group joining)
3. Create dinner groups (algorithm assigns members into meal groups)
4. Assign routes (algorithm creates meal rotation)
5. Generate & send email notifications
```

### Separation of Concerns

- **ChurchTools Groups**: Participant management, registration, contact data, lifecycle (open/close registration, archive)
- **Extension KV Store**: Dinner groups (meal groups), routes, metadata, workflow status
- **Extension UI**: Organizer tools only (no participant UI)

### Optional Features

The extension supports several optional features that organizers can enable per event:

1. **Partner Preferences** (`allowPartnerPreferences`)
   - Allows participants to specify people they'd like to be grouped with
   - If disabled: No partner preference field is created, algorithm groups randomly
   - If enabled: Custom field created, algorithm tries to honor preferences

2. **Dessert at After Party** (`afterParty.isDessertLocation`)
   - Allows holding dessert at a central venue instead of individual homes
   - If disabled: Standard 3-location routing (starter → main → dessert at different homes)
   - If enabled: Simplified 2-location routing (starter → main → all to after party for dessert)
   - Benefits:
     - Simplifies logistics (no need for dessert hosts)
     - Creates unified closing celebration
     - Easier for large groups
     - Reduces travel between meals

### Status & Lifecycle Management

**ChurchTools manages** (via group settings):

- `groupStatusId`: Lifecycle state (`active` → `finished` → `archived`)
- `isOpenForMembers`: Whether participants can join (toggle via extension UI)
- `signUpOpeningDate` / `signUpClosingDate`: Automatic registration windows
- `visibility`: `intern` for MVP (church members only)
- `allowWaitinglist`, `automaticMoveUp`, `waitinglistMaxPersons`: Waitlist settings
- `allowSpouseRegistration`: CT-native spouse co-registration

**Extension tracks** (in EventMetadata KV store):

- `status`: Workflow progress (`'active'` → `'groups-created'` → `'routes-assigned'` → `'notifications-sent'` → `'completed'`)
- Only tracks extension-specific workflow, not ChurchTools group state

**Lifecycle Mapping:**

| Running Dinner Phase | CT Status  | German     | Extension Behavior     |
| -------------------- | ---------- | ---------- | ---------------------- |
| Registration Open    | `active`   | Aktiv      | Full editing           |
| Groups/Routes Done   | `active`   | Aktiv      | Full editing           |
| Event Completed      | `finished` | Beendet    | Read-only in extension |
| Long-term Archive    | `archived` | Archiviert | Read-only in extension |

**Archive & Deletion Behavior:**

- **Archiving:** Allow from extension UI → sets CT `groupStatusId` to `archived` → read-only mode
- **Deletion:** Allow from extension UI → deletes CT group + all KV data
- **External deletion:** On extension load, detect missing CT groups and clean up orphaned KV data
- **KV retention:** Keep forever until explicit deletion

### Group & Route Change Management

Managing changes to dinner groups at different workflow stages requires careful handling to maintain data consistency and ensure participants are properly informed.

#### Key Principles

1. **Routes reference groups, not individual members** - Routes are calculated based on dinner group IDs and host addresses. Member changes within a group don't invalidate the route structure.
2. **Group count changes invalidate routes** - Adding or deleting groups fundamentally changes the routing matrix, requiring route recalculation.
3. **Post-notification changes require manual follow-up** - Once participants are notified, any changes require the organizer to manually inform affected people.

#### Change Rules by Workflow Stage

| Action                     | Before Routes (`active`) | After Routes (`routes-assigned`)        | After Notifications (`notifications-sent`) |
| -------------------------- | ------------------------ | --------------------------------------- | ------------------------------------------ |
| Create new group           | ✅ Allow                 | ⛔ Block - prompt to reset routes first | ⛔ Block - prompt to reset routes first    |
| Delete group               | ✅ Allow                 | ⛔ Block - prompt to reset routes first | ⛔ Block - prompt to reset routes first    |
| Add member to group        | ✅ Allow                 | ✅ Allow                                | ⚠️ Confirm - show affected participants    |
| Remove member from group   | ✅ Allow                 | ✅ Allow                                | ⚠️ Confirm - show affected participants    |
| Change host (within group) | ✅ Allow                 | ✅ Allow (address updates in route)     | ⚠️ Confirm - show affected participants    |
| Reset all groups           | ✅ Allow                 | ✅ Allow (also deletes routes)          | ⚠️ Confirm - show affected participants    |

#### "Reset Routes" Action

When routes need to be reset (either explicitly or due to group count changes):

1. Delete all routes for the event from KV store
2. Reset event status to `groups-created`
3. User can then modify groups freely and re-run route assignment

#### Post-Notification Confirmation Dialog

When changes are made after notifications have been sent, show a confirmation dialog with two sections:

**Section 1: Directly Affected (Group Members)**

- List all members of the modified group
- These people's group composition has changed

**Section 2: Indirectly Affected (Hosts Visited by This Group)**

- Based on current route, list the hosts of other groups that this group visits
- These hosts need to know about dietary/allergy changes or group size changes
- Example: "Group 3 visits: Anna (Starter), Max (Main Course), Lisa (Dessert)"

**Dialog Actions:**

- "Cancel" - Abort the change
- "Confirm Change" - Proceed with the change, organizer acknowledges they will inform affected participants

#### Implementation Notes

- `DinnerGroupBuilder.vue`: Check route existence before allowing group creation/deletion
- `DinnerGroupBuilder.vue`: On reset, also call `routeStore.deleteByEventId()` and update status
- `DinnerGroupBuilder.vue`: For post-notification changes, compute affected participants from route data
- Consider adding a "Copy affected emails" button in the confirmation dialog for convenience

## Technology Stack

- **Framework**: Vue 3 + TypeScript
- **State Management**: Pinia stores (abstracted for future widget use)
- **UI Components**: PrimeVue via `@churchtools-extensions/prime-volt`
- **Styling**: Tailwind CSS
- **Data Persistence**:
  - ChurchTools Groups API (participant data)
  - `@churchtools-extensions/persistance` / KV store (groups & routes)
- **ChurchTools Integration**: `@churchtools/churchtools-client`

## ChurchTools Group Configuration

### Parent Group Configuration

The extension requires a parent group "Running Dinner" to organize all event child groups. The extension will:

1. **Check for Parent Group Existence**:
   - On extension load, check if parent group "Running Dinner" exists
   - If not found, show warning banner: "Parent group 'Running Dinner' not found. Please create it to start organizing events."
   - Disable "Create New Event" button until parent group exists

2. **Parent Group Creation Wizard**:
   - Button: "Create Parent Group" (visible when parent group missing)
   - Opens dialog with:
     - Confirmation of group name: "Running Dinner"
     - Leader selection (Leiter): Dropdown of all persons
     - Co-Leader selection (Co-Leiter): Multi-select dropdown for multiple co-leaders
     - Preview of settings that will be applied
   - On creation:
     - Creates group with name "Running Dinner"
     - Sets group type to "Dienst" (service group)
     - Configures group settings:
       - `isOpenForMembers: false` (no direct joining)
       - `isPublic: false` (not public)
       - `isHidden: false` (visible to members)
       - `groupTypeId`: Service/Dienst type
       - `groupStatusId`: Active
     - Assigns roles:
       - Selected person(s) as "Leiter" (leader)
       - Selected person(s) as "Co-Leiter" (co-leader)
       - Deactivates all other group roles (no participants, no other roles needed)
     - Stores parent group ID in extension metadata
     - Shows success message with assigned leaders

3. **Parent Group Validation**:
   - Validates that current user is a leader (Leiter or Co-Leiter) of parent group
   - Only leaders can create child groups and use organizer features
   - Non-leaders see read-only view or permission error

4. **Parent Group Settings Management**:
   - Section in extension settings (optional future enhancement):
     - View current leaders
     - Add/remove co-leaders
     - Re-check parent group status

### Child Group Configuration (Event Groups)

When creating a child group for a running dinner event, the extension will automatically configure:

1. **Leader Assignment** (REQUIRED):
   - Event group MUST have a "Leiter" assigned for people to be able to join
   - Prompt organizer to select Leiter (default: current user)

2. **Registration Settings**:
   - `isOpenForMembers: true` (allow joining)
   - `visibility: 'intern'` (church members only for MVP)
   - `maxMembers: <configurable>` (default: 30)
   - `signUpOpeningDate` & `signUpClosingDate` (optional automatic windows)

3. **Waitlist Settings**:
   - `allowWaitinglist: <configurable>` (default: true)
   - `automaticMoveUp: <configurable>` (default: true)
   - `waitinglistMaxPersons: <configurable>` (default: null/unlimited)

4. **Co-Registration Settings**:
   - `allowSpouseRegistration: <configurable>` (default: true)
   - `allowOtherRegistration: false` (not needed if using partner preference field)

5. **Required Group Member Fields**:
   - Standard ChurchTools person fields (name, email, phone, address) - marked as required

6. **Custom Group-Member Fields** (to be created):
   - `mealPreference` (select: starter | mainCourse | dessert | none) - **always created**
   - `dietaryRestrictions` (textarea) - **always created**
   - `allergyInfo` (textarea) - **always created**
   - `partnerPreference` (text) - **conditionally created** (only if organizer enables it)
   - All marked as `requiredInRegistrationForm: true` for required fields

7. **Routines** (automatic email notifications):
   - **Waitlist promotion:** Trigger `waiting` → `active`, send welcome email
   - Created via `/api/routines` after group creation

### Event Creation Form Fields

| Field                           | Required | Default             | Notes                                   |
| ------------------------------- | -------- | ------------------- | --------------------------------------- |
| Event name                      | ✅       | -                   | e.g., "Running Dinner - Dezember 2025"  |
| Event date                      | ✅       | -                   | Date of the actual dinner event         |
| Leiter (Leader)                 | ✅       | Current user        | Required for CT group to accept members |
| Max participants                | ✅       | 30                  | Limits active members                   |
| Registration open date          | ❌       | Now                 | When registration opens                 |
| Registration close date         | ❌       | Event date - 7 days | When registration closes                |
| Enable waitlist                 | ❌       | true                | Allow waitlist when full                |
| Waitlist limit                  | ❌       | null (unlimited)    | Max waitlist size                       |
| Auto move-up                    | ❌       | true                | Auto-promote from waitlist              |
| Allow spouse registration       | ❌       | true                | CT-native spouse co-registration        |
| Partner preference field        | ❌       | true                | Custom text field for preferred partner |
| After-party location            | ❌       | -                   | Optional central venue address          |
| After-party is dessert location | ❌       | false               | If true, dessert is at after-party      |
| Menu timings                    | ✅       | -                   | Start/end times for each course         |
| Preferred group size            | ❌       | 2                   | Target size for dinner groups           |

### Group Member Data Structure

ChurchTools `GroupMember` provides:

```typescript
{
  person: DomainObjectPerson,      // Name, email, phone, address (from ChurchTools)
  groupMemberStatus: MemberStatus, // 'active' | 'waiting' | etc.
  fields: {                         // Custom group-member fields
    mealPreference?: string,
    dietaryRestrictions?: string,
    allergyInfo?: string,
    partnerPreference?: string,
  },
  memberStartDate: string,
  waitinglistPosition?: number,
}
```

## Data Models (Extension KV Store)

### 1. Event Metadata (`EventMetadata`)

Stores additional metadata not managed by ChurchTools group:

```typescript
interface EventMetadata {
  id: number; // KV store ID
  groupId: number; // ChurchTools child group ID

  // Menu timing
  menu: {
    starter: { startTime: string; endTime: string };
    mainCourse: { startTime: string; endTime: string };
    dessert: { startTime: string; endTime: string };
  };

  // Optional after party
  afterParty?: {
    time: string;
    location: string;
    description?: string;
    isDessertLocation: boolean; // If true, dessert course happens at after party location for all groups
  };

  // Configuration
  preferredGroupSize: number; // Default: 2 (couples)
  allowPartnerPreferences: boolean; // Default: false - Whether participants can specify partner preferences

  // Extension workflow status (separate from CT groupStatusId!)
  // CT groupStatusId: 1=pending, 2=active, 3=archived, 4=finished (lifecycle)
  // This status: tracks extension-specific workflow progress
  workflowStatus:
    | 'setup' // Event created, waiting for registrations
    | 'groups-created' // Meal groups assigned
    | 'routes-assigned' // Routes created but emails not sent
    | 'notifications-sent'; // Route emails sent to participants

  // Metadata
  organizerId: number; // ChurchTools person ID
  createdAt: string;
  updatedAt: string;
}
```

### 2. Dinner Group (`DinnerGroup`)

Represents a meal group (2-4 people eating together):

```typescript
interface DinnerGroup {
  id: number; // KV store ID
  eventMetadataId: number; // Reference to EventMetadata
  ctGroupId: number; // ChurchTools group ID
  groupNumber: number; // Human-readable (1, 2, 3...)

  // Members (ChurchTools person IDs)
  memberPersonIds: number[];

  // Meal assignment
  assignedMeal: 'starter' | 'mainCourse' | 'dessert';
  hostPersonId?: number; // Which member hosts this meal

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

### 3. Route (`Route`)

Represents a dinner route for one meal group:

```typescript
interface Route {
  id: number; // KV store ID
  eventMetadataId: number; // Reference to EventMetadata
  dinnerGroupId: number; // Reference to DinnerGroup

  // Route stops (always 3: starter → main → dessert)
  stops: Array<{
    meal: 'starter' | 'mainCourse' | 'dessert';
    hostDinnerGroupId: number; // Which dinner group hosts this meal
    // Address will be fetched from ChurchTools person data
    startTime: string;
    endTime: string;
  }>;

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

## Application Structure

```
extensions/running-dinner-groups/
├── docs/
│   ├── rdg-implementation-plan.md  # This file
│   └── lifecycle-and-state.md      # CT feature integration decisions
├── src/
│   ├── App.vue                      # Main app (single organizer view)
│   ├── config.ts                    # Extension key
│   ├── main.ts                      # App initialization
│   ├── stores/
│   │   ├── eventMetadata.ts        # Event metadata CRUD (KV store)
│   │   ├── dinnerGroup.ts          # Dinner group CRUD (KV store)
│   │   ├── route.ts                # Route CRUD (KV store)
│   │   └── churchtools.ts          # ChurchTools API wrapper
│   │                                #   - Groups (CRUD, status, settings)
│   │                                #   - Members (list, waitlist)
│   │                                #   - Fields (custom group member fields)
│   │                                #   - Routines (email automation)
│   │                                #   - Addresses (after-party location)
│   │                                #   - Persons (search for Leiter selection)
│   ├── services/
│   │   ├── GroupConfigService.ts   # Auto-configure child groups
│   │   ├── GroupingService.ts      # Grouping algorithm (reuse from old extension)
│   │   ├── RoutingService.ts       # Routing algorithm (reuse from old extension)
│   │   ├── EmailService.ts         # Email generation & sending
│   │   ├── RoutineService.ts       # Create/manage CT routines (welcome emails)
│   │   ├── AddressService.ts       # Manage group addresses (after-party)
│   │   └── SyncService.ts          # KV cleanup on orphaned data
│   ├── views/
│   │   └── OrganizerView.vue       # Main organizer dashboard
│   ├── components/
│   │   ├── ParentGroupSetup.vue    # Parent group creation wizard
│   │   ├── EventCard.vue           # Display event (child group) with status
│   │   ├── EventCreator.vue        # Create new event with full config
│   │   ├── EventActions.vue        # Archive/delete confirmation dialogs
│   │   ├── MemberList.vue          # Display group members + waitlist
│   │   ├── DinnerGroupBuilder.vue  # Create & manage dinner groups
│   │   ├── DinnerGroupCard.vue     # Display dinner group
│   │   ├── RouteAssignment.vue     # Assign & display routes
│   │   ├── RouteCard.vue           # Display individual route
│   │   └── EmailPreview.vue        # Preview & send emails
│   ├── types/
│   │   └── models.ts               # TypeScript interfaces with Zod schemas
│   └── utils/
│       └── churchtools.ts          # Helper functions for CT API
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Core Services

### 1. GroupConfigService

Automates ChurchTools group configuration:

```typescript
class GroupConfigService {
  /**
   * Check if parent group "Running Dinner" exists
   */
  async checkParentGroup(): Promise<{
    exists: boolean;
    group?: Group;
    isLeader?: boolean;
  }> {
    // 1. Search for group with name "Running Dinner"
    // 2. If found, check if current user is Leiter or Co-Leiter
    // 3. Return existence status and leadership status
  }

  /**
   * Create the parent "Running Dinner" group
   */
  async createParentGroup(options: {
    leaderPersonId: number;
    coLeaderPersonIds: number[];
  }): Promise<Group> {
    // 1. Get group types to find "Dienst" type
    // GET /group/grouptypes

    // 2. Get available roles for Dienst group type
    // GET /group/roles (then filter by groupTypeId)

    // 3. Create group via ChurchTools API (minimal required fields):
    const groupData = {
      name: 'Running Dinner',
      groupTypeId: dienstType.id,
      groupStatusId: 1, // 1=active, 2=pending, 3=archived, 4=finished
      // Note: Settings like isOpenForMembers, isPublic etc. are configured
      // through PATCH /groups/{id} after creation or use defaults
    };
    // POST /groups

    // 4. Assign Leiter role to leader
    // PUT /groups/{id}/members/{personId}
    // Body: { groupTypeRoleId: leiterRole.id, groupMemberStatus: 'active' }

    // 5. Assign Co-Leiter role(s) to co-leaders
    // PUT /groups/{id}/members/{personId} for each co-leader
    // Body: { groupTypeRoleId: coLeiterRole.id, groupMemberStatus: 'active' }

    // Note: No need to "deactivate" other roles - just don't assign anyone to them

    // 6. Return created group
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
  }): Promise<number> {
    // 1. Create child group via ChurchTools API
    // 2. Set parent group (hierarchical) - use targetGroupId
    // 3. Configure settings: waitlist, max members, registration dates
    // 4. Create custom group-member fields (if not exist)
    // 5. Mark standard fields as required (name, email, phone, address)
    // 6. Create EventMetadata in KV store
    // 7. Return group ID
  }

  /**
   * Ensure custom group-member fields exist on the group
   */
  async ensureCustomFields(groupId: number): Promise<void> {
    // Check if fields exist, create if not:
    // - mealPreference (select with options)
    // - dietaryRestrictions (textarea)
    // - allergyInfo (textarea)
    // - partnerPreference (text)
  }

  /**
   * Update group settings (lock/unlock registration)
   */
  async updateGroupSettings(
    groupId: number,
    settings: Partial<GroupSettings>,
  ): Promise<void> {
    // Update isOpenForMembers, maxMembers, etc.
  }

  /**
   * Update parent group leaders
   */
  async updateParentGroupLeaders(options: {
    parentGroupId: number;
    leaderPersonId?: number;
    coLeaderPersonIds?: number[];
  }): Promise<void> {
    // 1. Update Leiter role assignment
    // 2. Update Co-Leiter role assignments
    // 3. Handle role transitions
  }
}
```

### 2. GroupingService

Reuses logic from original extension with modifications:

```typescript
class GroupingService {
  /**
   * Create dinner groups from ChurchTools group members
   * Input: ChurchTools GroupMember[] (with custom fields)
   * Output: DinnerGroup[] (to be saved in KV store)
   */
  createDinnerGroups(
    eventMetadata: EventMetadata,
    members: GroupMember[],
  ): GroupingResult {
    // 1. Filter out waiting list members
    // 2. Extract partner preferences from custom fields
    // 3. Build preference graph (mutual & one-sided)
    // 4. Form groups respecting preferences & group size
    // 5. Assign meals (balance across 3 meal types)
    // 6. Return dinner groups + warnings
    // Algorithm reuses logic from: extensions/running-dinner/src/algorithms/grouping.ts
  }
}

interface GroupingResult {
  dinnerGroups: Omit<DinnerGroup, 'id'>[];
  warnings: string[];
  waitlistedPersonIds: number[]; // People excluded from groups
}
```

### 3. RoutingService

Reuses logic from original extension:

```typescript
class RoutingService {
  /**
   * Assign routes to dinner groups
   * Constraint: No group meets another group more than once
   * Special case: If dessert is at after party location, all groups go to the same venue for dessert
   */
  assignRoutes(
    eventMetadata: EventMetadata,
    dinnerGroups: CategoryValue<DinnerGroup>[],
    members: GroupMember[], // For address lookup
  ): RoutingResult {
    // Reuses logic from: extensions/running-dinner/src/algorithms/routing.ts
    // 1. Check if dessert is at after party (eventMetadata.afterParty.isDessertLocation)
    // 2a. If yes: Simplified routing - only assign starter and main course hosts,
    //     dessert location is after party venue for all groups
    // 2b. If no: Standard routing - all three meals at different homes
    // 3. Use backtracking algorithm to assign routes
    // 4. Populate addresses from ChurchTools person data
    // 5. Return routes
  }
}

interface RoutingResult {
  routes: Omit<Route, 'id'>[];
  warnings: string[];
}
```

### 4. EmailService

Generates and sends email notifications:

```typescript
class EmailService {
  /**
   * Generate email content for route publication
   */
  generateRouteEmail(
    eventMetadata: EventMetadata,
    route: CategoryValue<Route>,
    dinnerGroup: CategoryValue<DinnerGroup>,
    members: GroupMember[],
  ): EmailContent {
    // Generate HTML email with:
    // - Event details
    // - Group members with contact info
    // - Full route (3 stops with addresses, times, Google Maps links)
    //   - Special handling: If dessert is at after party, show venue instead of home
    // - Dietary restrictions of guests at each stop
    // - After party info
  }

  /**
   * Send email via ChurchTools email API
   * Falls back to console.log for now
   */
  async sendEmail(
    recipientPersonIds: number[],
    subject: string,
    body: string,
  ): Promise<void> {
    // Use ChurchTools /events/send or similar API
    // For MVP: console.log email content
  }
}

interface EmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}
```

### 5. RoutineService (NEW)

Manages ChurchTools Routines for automated notifications:

```typescript
class RoutineService {
  /**
   * Create a routine for waitlist promotion notifications
   * Triggered when member status changes from 'waiting' to 'active'
   */
  async createWaitlistPromotionRoutine(
    groupId: number,
    roleId: number,
    emailSubject: string,
    emailBody: string,
  ): Promise<number> {
    // 1. Create routine
    // POST /api/routines
    // {
    //   "domainType": "group_membership",
    //   "name": "Waitlist Promotion Notification",
    //   "domainContext": {
    //     "groupId": groupId,
    //     "groupTypeRoleId": roleId,
    //     "groupMemberStatus": "active"  // Triggers when becoming active
    //   }
    // }
    // 2. Add email step
    // PATCH /api/routines/{id}
    // {
    //   "steps": [{
    //     "actionKey": "send-member-email",
    //     "actionData": {
    //       "senderId": 0,
    //       "subject": emailSubject,
    //       "body": emailBody,
    //       "addSignOutUrl": true
    //     },
    //     "isEnabled": true
    //   }]
    // }
    // 3. Enable routine
    // PATCH /api/routines/{id}
    // { "isEnabled": true }
    // 4. Return routine ID for storage
  }

  /**
   * Delete routines associated with a group
   */
  async deleteGroupRoutines(groupId: number): Promise<void> {
    // GET /api/groups/{groupId}/members/routines
    // DELETE /api/routines/{id} for each
  }

  /**
   * Get available placeholders for email templates
   */
  async getPlaceholders(groupId: number): Promise<PlaceholderInfo> {
    // GET /api/placeholders/email
    // GET /api/placeholders/group/{groupId}
  }
}

// Available placeholders:
// - {{{person.firstName}}}, {{{person.lastName}}}, {{{person.email}}}
// - {{{group.name}}}, {{{group.meetingtime}}}
// - {{{groupMember.role}}}, {{{groupMember.status}}}, {{{groupMember.waitinglistPosition}}}
// - {{{groupMemberField.mealpreference}}}, {{{groupMemberField.dietaryrestrictions}}}
```

### 6. SyncService (NEW)

Handles synchronization between ChurchTools and KV store:

```typescript
class SyncService {
  /**
   * On extension load, sync CT groups with KV data
   * - Detect deleted CT groups
   * - Clean up orphaned KV entries
   */
  async syncOnLoad(): Promise<SyncResult> {
    // 1. Get all EventMetadata from KV store
    // 2. For each, check if CT group still exists
    // 3. If CT group deleted:
    //    - Delete EventMetadata
    //    - Delete associated DinnerGroups
    //    - Delete associated Routes
    // 4. Return sync results (deleted count, errors)
  }

  /**
   * Delete an event and all associated data
   */
  async deleteEvent(eventMetadataId: number): Promise<void> {
    // 1. Get EventMetadata
    // 2. Delete CT group (this is source of truth)
    // 3. Delete all KV data:
    //    - Routes for this event
    //    - DinnerGroups for this event
    //    - EventMetadata
  }

  /**
   * Archive an event (set CT group to archived status)
   */
  async archiveEvent(eventMetadataId: number): Promise<void> {
    // 1. Get EventMetadata
    // 2. Update CT group: groupStatusId = 3 (archived)
    // 3. KV data remains unchanged (read-only access)
  }
}

interface SyncResult {
  deletedEvents: number;
  errors: string[];
}
```

### 7. AddressService (NEW)

Manages group addresses (replaces deprecated places API):

```typescript
class AddressService {
  /**
   * Set after-party location for an event group
   */
  async setAfterPartyLocation(
    groupId: number,
    address: {
      name: string;
      street: string;
      city: string;
      zip: string;
    },
  ): Promise<void> {
    // POST /api/addresses/group/{groupId}
  }

  /**
   * Get after-party location for an event group
   */
  async getAfterPartyLocation(groupId: number): Promise<Address | null> {
    // GET /api/addresses/group/{groupId}
  }
}
```

## User Flows

### Organizer Workflow

#### 0. Parent Group Setup (First-Time Only)

1. Navigate to extension for the first time
2. Extension checks for parent group "Running Dinner"
3. If not found:
   - Warning banner appears: "Parent group 'Running Dinner' not found. Please create it to start organizing events."
   - "Create New Event" button is disabled
   - "Create Parent Group" button is visible
4. Click "Create Parent Group"
5. Dialog opens with form:
   - Group name: "Running Dinner" (read-only)
   - Leader (Leiter): Dropdown to select person (default: current user)
   - Co-Leaders (Co-Leiter): Multi-select dropdown for additional leaders
   - Preview section showing:
     - Group type: "Dienst" (Service)
     - Settings: No joining allowed, not public
     - Roles: Only Leiter and Co-Leiter active
6. Click "Create" → Extension:
   - Creates parent group via ChurchTools API
   - Sets group type to "Dienst"
   - Configures settings (no joining, not public)
   - Assigns selected leader and co-leaders
   - Deactivates all other group roles
   - Stores parent group ID in extension metadata
7. Success toast → Parent group created
8. Extension refreshes → Warning banner disappears, "Create New Event" button enabled

#### 1. Create New Event

1. Navigate to extension (parent group exists)
2. Click "Create New Event"
3. Modal opens with form:

   **Basic Information**
   - Event name (e.g., "Running Dinner - December 2025")
   - Description (optional)
   - Event date
   - **Leiter (Leader)**: Person dropdown (required - groups need a leader for members to join!)

   **Registration Settings**
   - Max participants (default: 30)
   - **Waitlist Settings**:
     - Enable waitlist (checkbox, default: true)
     - Max waitlist size (default: 10)
     - Auto move-up (checkbox, default: true)
   - **Co-Registration Settings**:
     - Allow spouse registration (checkbox, default: true)
     - Allow other registration (checkbox, default: false)
   - Registration opens (date, optional - leave blank for "open immediately")
   - Registration closes (date, optional)

   **Event Configuration**
   - Preferred group size (default: 2)
   - Menu timings (start/end for each meal)
   - Optional: After party details
     - Time and location (uses Address API)
     - Optional: Hold dessert at after party location (checkbox)
       - When enabled, all groups gather at after party venue for dessert instead of visiting individual homes
       - Simplifies logistics and creates a unified closing celebration
   - Optional: Partner preferences (checkbox - adds custom field for partner preference)

4. Click "Create" → Extension:
   - Creates ChurchTools child group with:
     - `groupStatusId: 1` (pending) - waiting for registration to open
     - `isOpenForMembers: false` initially
     - `visibility: intern` (always for MVP)
     - `allowWaitinglist: true/false` per settings
     - `waitinglistMaxPersons` per settings
     - `automaticMoveUp: true/false` per settings
     - `allowSpouseRegistration: true/false` per settings
     - `allowOtherRegistration: true/false` per settings
     - `signUpOpeningDate` / `signUpClosingDate` if provided
   - Assigns leader to group
   - Creates custom fields
   - Creates EventMetadata in KV store
   - Optionally creates welcome email Routine (if configured)
   - Sets after-party address via Address API (if provided)
5. Success toast → Event appears in list with "Pending" status

#### 2. Activate Event (Open Registration)

1. Find event in list (status: "Pending")
2. Click "Activate Event"
   - Extension updates group: `groupStatusId = 2` (active)
   - If no `signUpOpeningDate` set, also sets `isOpenForMembers = true`
   - Success toast → Event status changes to "Active"
3. Registration follows CT-native behavior:
   - If `signUpOpeningDate` is set, registration opens automatically on that date
   - If `signUpClosingDate` is set, registration closes automatically on that date
   - Manual override: Click "Close Registration" to set `isOpenForMembers = false`
   - Manual override: Click "Open Registration" to set `isOpenForMembers = true`

#### 2a. Archive/Delete Event

**Archive (soft delete - reversible):**

1. Click "..." menu on event card → "Archive Event"
2. Confirmation dialog: "Archive this event? It will be hidden but can be restored."
3. Click "Archive" → Extension:
   - Updates group: `groupStatusId = 3` (archived)
   - Event disappears from active list, appears in "Archived" filter
   - KV data preserved (read-only access for historical records)
4. To restore: View archived events → Click "Restore" → Sets `groupStatusId = 2` (active)

**Delete (hard delete - irreversible):**

1. Click "..." menu on event card → "Delete Event"
2. Confirmation dialog with event name: "Type event name to confirm deletion. This cannot be undone."
3. Type event name, click "Delete Permanently" → Extension:
   - Deletes CT group (source of truth)
   - SyncService cleans up orphaned KV data on next load
   - Event completely removed
4. Success toast

#### 3. Monitor Registrations

1. Click on event card
2. Detail modal opens with tabs:
   - **Overview**: Event details, registration stats
   - **Members**: List of registered members (from ChurchTools)
     - Active members (green badge)
     - Waiting list (yellow badge)
     - Display custom fields (meal preference, dietary restrictions)
     - Filter & search
   - **Dinner Groups**: (empty until created)
   - **Routes**: (empty until assigned)

#### 4. Create Dinner Groups

1. Navigate to "Dinner Groups" tab
2. Click "Create Dinner Groups"
3. Algorithm runs → Shows results:
   - Number of dinner groups created
   - Warnings (if any)
   - List of unassigned members (excess/waitlist)
4. Display dinner groups with members, meal assignments
5. Manual adjustments available:
   - Add/remove members
   - Set host
   - Change meal assignment
   - Delete empty groups
6. Click "Save Dinner Groups" → Extension:
   - Saves DinnerGroup[] to KV store
   - Updates EventMetadata status to 'groups-created'
7. Success toast

#### 5. Assign Routes

1. Navigate to "Routes" tab
2. Click "Assign Routes"
3. Algorithm runs → Shows results:
   - All routes displayed (timeline view)
   - Warnings (if any)
4. Review routes
5. Click "Save Routes" → Extension:
   - Saves Route[] to KV store
   - Updates EventMetadata status to 'routes-assigned'
6. Success toast

#### 6. Send Notifications

1. Routes tab, click "Send Email Notifications"
2. Preview modal shows example email
3. Click "Send to All" → Extension:
   - Generates personalized email for each dinner group
   - Sends via ChurchTools email API (or logs to console)
   - Updates EventMetadata status to 'notifications-sent'
4. Success toast with count of emails sent

#### 7. Complete Event

1. After event is finished, organizer can mark as completed
2. Click "Mark as Completed" button
3. Extension updates CT group: `groupStatusId = 4` (finished)
4. Event appears with "Finished" badge
5. KV data preserved for historical reference
6. **Note**: "Finished" is distinct from "Archived":
   - Finished = event happened, still visible in main list, data preserved
   - Archived = hidden from view, can be restored if needed

### Participant Flow (ChurchTools Native)

Participants never use the extension UI. They interact via ChurchTools:

1. **Discover Event**: Browse ChurchTools groups, see "Running Dinner - December 2025"
2. **Join Group**: Click "Join" in ChurchTools
3. **Fill Registration Form**: ChurchTools presents form with required fields:
   - Standard: Name, email, phone, address (pre-filled from profile)
   - Custom: Meal preference, dietary restrictions, partner preference
4. **Submit**: ChurchTools saves as group member
   - `registeredBy` field tracks who registered the person (for spouse/other registration)
5. **Waitlist**: If max reached, automatically placed on waitlist
   - If `automaticMoveUp: true`, auto-promoted when spot opens (no notification!)
6. **Welcome Email**: If Routine configured, CT automatically sends welcome email
7. **Receive Route Email**: After routes assigned, receives personalized email with:
   - Group members and contact info
   - Full route (3 stops)
   - Dietary restrictions of guests
   - Google Maps links
   - After party details

### Waitlist Promotion Flow

When `automaticMoveUp: true` and a spot opens:

1. ChurchTools automatically moves first waitlist person to active
2. **No automatic notification** from CT!
3. Options for notification:
   - Manual: Organizer sends email to promoted person
   - Future: Create a Routine with "member becomes active" trigger (if CT supports)
   - Future: Extension periodically checks for promotions and sends notifications

## Views & Components

### OrganizerView.vue

Main dashboard with:

- Header: Extension title, "Create New Event" button
- Event list: Cards for all child groups
  - Each card shows: name, date, status badge, member count
  - Click card → Opens detail modal

### EventCard.vue

Displays:

- Event name & date
- Status badge (color-coded based on CT groupStatusId):
  - 🟡 Pending (groupStatusId: 1) - yellow
  - 🟢 Active (groupStatusId: 2) - green
  - 🔵 Finished (groupStatusId: 4) - blue
  - ⚫ Archived (groupStatusId: 3) - gray
- Registration status: Open/Closed indicator
- Member count (active / max + waitlist count)
- Quick actions menu (⋯):
  - Activate (if pending)
  - Open/Close Registration (if active)
  - Mark as Finished (if active)
  - Archive (if active or finished)
  - Delete (with confirmation)

### EventCreator.vue

Modal dialog with multi-section form:

**Section 1: Basic Information**

- Event name (text input, required)
- Description (textarea, optional)
- Event date (date picker, required)
- Leiter/Leader (person dropdown, required - **critical for group joining!**)

**Section 2: Registration Settings**

- Max participants (number input, default: 30)
- Waitlist enabled (checkbox, default: true)
  - Max waitlist size (number input, shown if waitlist enabled)
  - Auto move-up (checkbox, shown if waitlist enabled)
- Allow spouse registration (checkbox, default: true)
- Allow other registration (checkbox, default: false)
- Registration opens (date picker, optional)
- Registration closes (date picker, optional)

**Section 3: Event Configuration**

- Preferred group size (number input, default: 2)
- Menu timing (time pickers for each course)
- Partner preferences enabled (checkbox)

**Section 4: After Party (optional)**

- Enable after party (checkbox)
  - After party time (time picker)
  - Location name (text input)
  - Street address (text input)
  - City (text input)
  - ZIP code (text input)
- Hold dessert at after party (checkbox)

**Footer**

- Cancel / Create buttons
- Validation with Zod
- Submit → Calls GroupConfigService + AddressService

### MemberList.vue

DataTable with:

- Columns: Name, Email, Phone, Status, Meal Preference, Dietary Restrictions
- Filters: Status (active/waiting)
- Search
- Actions: None (read-only, managed by ChurchTools)

### DinnerGroupBuilder.vue

Reuses logic from `extensions/running-dinner/src/components/GroupBuilder.vue`:

- "Create Dinner Groups" button
- Status dashboard (members, groups, warnings)
- Dinner group cards (grid layout)
- Manual adjustment controls
- Save/Reset buttons

### DinnerGroupCard.vue

Reuses logic from `extensions/running-dinner/src/components/GroupCard.vue`:

- Group number & meal badge
- Member list with host indicator
- Dietary restrictions summary
- Actions: Set host, remove member, delete group

### RouteAssignment.vue

Reuses logic from `extensions/running-dinner/src/components/RouteAssignment.vue`:

- "Assign Routes" button
- Route cards (timeline view)
- Manual adjustments (reset)
- Save button
- "Send Notifications" button

### RouteCard.vue

Timeline display with:

- 3 stops (starter → main → dessert)
- Host group number & address
- Time range
- Google Maps link
- Guest dietary restrictions
- After party info (on dessert stop)

### EmailPreview.vue

Modal showing:

- Email subject
- HTML preview
- Send actions (test email, send all)

## Pinia Stores

All stores designed for future widget compatibility (no UI coupling):

### churchtools.ts

Wrapper around ChurchTools API:

```typescript
export const useChuchtoolsStore = defineStore('churchtools', () => {
  // ===== GROUPS =====

  async function getParentGroup(): Promise<Group | null> {
    // Find "Running Dinner" parent group
  }

  async function getChildGroups(parentId: number): Promise<Group[]> {
    // Get all child groups
  }

  async function createChildGroup(data: GroupCreate): Promise<Group> {
    // POST /groups
    // Include all CT-native settings:
    // - groupStatusId, visibility, maxMembers
    // - isOpenForMembers, signUpOpeningDate, signUpClosingDate
    // - allowWaitinglist, waitinglistMaxPersons, automaticMoveUp
    // - allowSpouseRegistration, allowOtherRegistration
  }

  async function updateGroup(
    groupId: number,
    data: Partial<Group>,
  ): Promise<void> {
    // PUT /groups/{id}
  }

  async function updateGroupStatus(
    groupId: number,
    groupStatusId: 1 | 2 | 3 | 4, // pending | active | archived | finished
  ): Promise<void> {
    // PATCH /groups/{id} with { groupStatusId }
  }

  async function deleteGroup(groupId: number): Promise<void> {
    // DELETE /groups/{id}
  }

  // ===== MEMBERS =====

  async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
    // GET /groups/{id}/members (paginated)
    // Includes waitinglistPosition for waitlist members
    // Includes registeredBy for co-registration tracking
  }

  // ===== FIELDS =====

  async function getGroupMemberFields(
    groupId: number,
  ): Promise<GroupMemberField[]> {
    // GET /groups/{id}/memberfields
  }

  async function createGroupMemberField(
    groupId: number,
    field: GroupMemberFieldCreate,
  ): Promise<GroupMemberField> {
    // POST /groups/{id}/memberfields
  }

  // ===== PERSON =====

  async function getCurrentUser(): Promise<Person> {
    // GET /whoami
  }

  async function getPerson(personId: number): Promise<Person> {
    // GET /persons/{id}
  }

  async function searchPersons(query: string): Promise<Person[]> {
    // GET /persons?query={query}
    // Used for Leiter selection dropdown
  }

  // ===== ROUTINES =====

  async function createRoutine(data: RoutineCreate): Promise<Routine> {
    // POST /api/routines
  }

  async function updateRoutine(
    routineId: number,
    data: Partial<Routine>,
  ): Promise<void> {
    // PATCH /api/routines/{id}
  }

  async function getGroupRoutines(groupId: number): Promise<Routine[]> {
    // GET /api/routines?domainType=group&domainIdentifier={groupId}
  }

  // ===== ADDRESSES =====

  async function getGroupAddresses(groupId: number): Promise<Address[]> {
    // GET /api/addresses/group/{groupId}
  }

  async function createGroupAddress(
    groupId: number,
    address: AddressCreate,
  ): Promise<Address> {
    // POST /api/addresses/group/{groupId}
  }

  return {
    getParentGroup,
    getChildGroups,
    createChildGroup,
    updateGroup,
    updateGroupStatus,
    deleteGroup,
    getGroupMembers,
    getGroupMemberFields,
    createGroupMemberField,
    getCurrentUser,
    getPerson,
    searchPersons,
    createRoutine,
    updateRoutine,
    getGroupRoutines,
    getGroupAddresses,
    createGroupAddress,
  };
});
```

### eventMetadata.ts

CRUD for EventMetadata (KV store):

```typescript
export const useEventMetadataStore = defineStore('eventMetadata', () => {
  const events = ref<CategoryValue<EventMetadata>[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  async function fetchAll(): Promise<void> {
    // Load from KV store
  }

  async function create(
    data: Omit<EventMetadata, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<number> {
    // Save to KV store
  }

  async function update(
    id: number,
    patch: Partial<EventMetadata>,
  ): Promise<void> {
    // Update in KV store
  }

  async function remove(id: number): Promise<void> {
    // Delete from KV store
  }

  function getByGroupId(
    ctGroupId: number,
  ): CategoryValue<EventMetadata> | undefined {
    // Find by ChurchTools group ID
  }

  return {
    events,
    loading,
    saving,
    error,
    fetchAll,
    create,
    update,
    remove,
    getByGroupId,
  };
});
```

### dinnerGroup.ts

CRUD for DinnerGroup (KV store):

```typescript
export const useDinnerGroupStore = defineStore('dinnerGroup', () => {
  const dinnerGroups = ref<CategoryValue<DinnerGroup>[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  async function fetchAll(): Promise<void> {
    // Load from KV store
  }

  async function createMultiple(
    groups: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<void> {
    // Batch create in KV store
  }

  async function update(
    id: number,
    patch: Partial<DinnerGroup>,
  ): Promise<void> {
    // Update in KV store
  }

  async function deleteByEventId(eventMetadataId: number): Promise<void> {
    // Delete all dinner groups for event
  }

  function getByEventId(eventMetadataId: number): CategoryValue<DinnerGroup>[] {
    // Filter by event
  }

  return {
    dinnerGroups,
    loading,
    saving,
    error,
    fetchAll,
    createMultiple,
    update,
    deleteByEventId,
    getByEventId,
  };
});
```

### route.ts

CRUD for Route (KV store):

```typescript
export const useRouteStore = defineStore('route', () => {
  const routes = ref<CategoryValue<Route>[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  async function fetchAll(): Promise<void> {
    // Load from KV store
  }

  async function createMultiple(
    routes: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<void> {
    // Batch create in KV store
  }

  async function deleteByEventId(eventMetadataId: number): Promise<void> {
    // Delete all routes for event
  }

  function getByEventId(eventMetadataId: number): CategoryValue<Route>[] {
    // Filter by event
  }

  function getByDinnerGroupId(
    dinnerGroupId: number,
  ): CategoryValue<Route> | undefined {
    // Find route for dinner group
  }

  return {
    routes,
    loading,
    saving,
    error,
    fetchAll,
    createMultiple,
    deleteByEventId,
    getByEventId,
    getByDinnerGroupId,
  };
});
```

## Core Algorithms

### Grouping Algorithm

**Reuse from**: `extensions/running-dinner/src/algorithms/grouping.ts`

**Modifications needed**:

- Input: `GroupMember[]` instead of `CategoryValue<Participant>[]`
- Extract partner preferences from `fields.partnerPreference` (parse comma-separated)
- Extract meal preferences from `fields.mealPreference`
- Match preferences by email or name against other members
- Output: `DinnerGroup[]` with `memberPersonIds` instead of `participantIds`

**Algorithm logic remains the same**:

1. Filter waiting list members
2. Build preference graph (mutual & one-sided)
3. Form groups (greedy approach)
4. Assign meals (balanced across 3 types)
5. Return groups + warnings

### Routing Algorithm

**Reuse from**: `extensions/running-dinner/src/algorithms/routing.ts`

**Modifications needed**:

- Input: `DinnerGroup[]` instead of `Group[]`
- Look up addresses from ChurchTools `Person` data (via `memberPersonIds`)
- Output: `Route[]` with stops referencing `DinnerGroup` IDs

**Algorithm logic remains the same**:

1. Validate balanced meal assignments
2. Use backtracking to assign routes
3. Ensure no group meets twice
4. Populate addresses and timing
5. Return routes + warnings

## Implementation Phases

### Phase 1: Foundation ✅ Complete

**Goal**: Project structure, ChurchTools integration, data models

1. **Project Setup**
   - [x] Create `extensions/running-dinner-groups/` directory
   - [x] Copy `package.json`, `vite.config.ts`, `tsconfig.json` from running-dinner
   - [x] Update extension key to `running-dinner-groups`
   - [x] Install dependencies
   - [x] Setup main.ts and App.vue

2. **Data Models**
   - [x] Create `src/types/models.ts` with TypeScript interfaces
   - [x] Add Zod schemas for validation (EventMetadata, DinnerGroup, Route)
   - [x] Export types
   - [x] Simplified EventStatus to track extension workflow only

3. **ChurchTools Store**
   - [x] Create `src/stores/churchtools.ts`
   - [x] Implement group CRUD operations with real ChurchTools API
   - [x] Implement group type/status queries (for Dienst type)
   - [x] Implement group role management (assign Leiter, Co-Leiter)
   - [x] Implement member fetching (with automatic pagination handling)
   - [x] Implement field management
   - [x] Add response normalization helper for API consistency

4. **KV Store Setup**
   - [x] Create `src/stores/eventMetadata.ts` with PersistanceCategory
   - [x] Create `src/stores/dinnerGroup.ts` with PersistanceCategory
   - [x] Create `src/stores/route.ts` with PersistanceCategory
   - [x] Test data persistence (lazy initialization pattern)

### Phase 2: Group Configuration Service ✅ Complete

**Goal**: Automate ChurchTools group setup

5. **GroupConfigService**
   - [x] Create `src/services/GroupConfigService.ts`
   - [x] Implement `checkParentGroup()`:
     - Search for "Running Dinner" group
     - Check if current user is Leiter or Co-Leiter
     - Return status and leadership info
   - [x] Implement `createParentGroup()`:
     - Create group with name "Running Dinner"
     - Set group type to "Dienst"
     - Configure settings (no joining, not public)
     - Assign Leiter and Co-Leiter roles
     - Deactivate all other group roles
     - Store parent group ID in extension metadata
   - [x] Implement `createChildGroup()`:
     - Create group via API
     - Set parent relationship (targetGroupId)
     - Configure settings (waitlist, max members)
     - Create EventMetadata in KV
   - [x] Implement `ensureCustomFields()`:
     - Check if fields exist
     - Create missing fields:
       - mealPreference (select with options)
       - dietaryRestrictions (textarea)
       - allergyInfo (textarea)
       - partnerPreference (text)
   - [x] Implement `updateGroupSettings()` (lock/unlock registration)
   - [x] Implement `updateParentGroupLeaders()`
   - [x] Add `getAllPersons()` helper method
   - [x] Add error handling and logging

6. **EventCreator Component**
   - [x] Create `src/components/EventCreator.vue`
   - [x] Form with validation (Zod):
     - Event name, description, date
     - Max members, group size
     - **Allow partner preferences toggle** (configurable by organizer)
     - Menu timing
     - After party (optional)
   - [x] Call GroupConfigService on submit
   - [x] Show success/error toasts

7. **Parent Group Management UI**
   - [x] Create `src/components/ParentGroupSetup.vue`:
     - Warning banner when parent group missing
     - "Create Parent Group" button
     - Creation dialog with:
       - Leader selection (dropdown, default current user)
       - Co-leader selection (multi-select)
       - Settings preview
     - Validation and submit
   - [x] Implement parent group status check on extension load
   - [x] Auto-select current user as default leader
   - [x] Toast notifications for success/error
   - [x] Expose hasPermission computed property

8. **OrganizerView Basic**
   - [x] Update `src/views/OrganizerView.vue`
   - [x] Integrate ParentGroupSetup component
   - [x] Conditional rendering based on parent group status:
     - If missing: Show ParentGroupSetup
     - If exists & user is leader: Show main UI
     - If exists & user is not leader: Show permission error
   - [x] "Create New Event" button → Opens EventCreator (placeholder dialog)
   - [x] Fetch and display child groups
   - [x] EventCard component (inline, basic display)

### Phase 3: Event Management UI

**Goal**: Display events, manage status, view members

9. **EventCard & Detail Modal**
   - [ ] Create `src/components/EventCard.vue`:
     - Display name, date, status badge, member count
     - Quick actions (publish, close registration, delete)
   - [ ] Implement detail modal with tabs:
     - Overview tab (event details, stats)
     - Members tab (next step)
     - Dinner Groups tab (placeholder)
     - Routes tab (placeholder)

10. **Member Management**

- [ ] Create `src/components/MemberList.vue`:
  - DataTable with ChurchTools members
  - Columns: name, email, phone, status, meal pref, dietary restrictions
  - Filter by status (active/waiting)
  - Search functionality
- [ ] Integrate into Members tab

11. **Status Management (CT-Native)**
    - [ ] Implement activate action:
      - Update group `groupStatusId = 2` (active)
      - Optionally set `isOpenForMembers = true`
      - Confirmation dialog
    - [ ] Implement finish event action:
      - Update group `groupStatusId = 4` (finished)
      - Confirmation dialog
    - [ ] Implement archive action:
      - Update group `groupStatusId = 3` (archived)
      - Event hidden from main list, KV data preserved
      - Confirmation dialog
    - [ ] Implement restore action (from archived):
      - Update group `groupStatusId = 2` (active)
    - [ ] Implement delete action:
      - Delete CT group (source of truth)
      - SyncService cleans up orphaned KV data
      - Requires typing event name to confirm
    - [ ] Status badges: 🟡 Pending, 🟢 Active, 🔵 Finished, ⚫ Archived

### Phase 4: Grouping Algorithm & UI

**Goal**: Create dinner groups from members

12. **GroupingService**
    - [ ] Create `src/services/GroupingService.ts`
    - [ ] Port algorithm from `extensions/running-dinner/src/algorithms/grouping.ts`
    - [ ] Adapt input/output:
      - Input: `GroupMember[]` (from ChurchTools)
      - Extract preferences from custom fields
      - Output: `DinnerGroup[]`
    - [ ] Add unit tests (optional)

13. **DinnerGroupBuilder Component**
    - [ ] Copy `src/components/GroupBuilder.vue` from running-dinner
    - [ ] Adapt to work with DinnerGroup[] and GroupMember[]
    - [ ] "Create Dinner Groups" button → Calls GroupingService
    - [ ] Display results with warnings
    - [ ] Manual adjustments:
      - Add/remove members
      - Set host
      - Change meal assignment
      - Delete groups
    - [ ] Save → Store DinnerGroup[] in KV, update status

14. **DinnerGroupCard Component**
    - [ ] Copy `src/components/GroupCard.vue` from running-dinner
    - [ ] Adapt to display DinnerGroup with ChurchTools person data
    - [ ] Show members, host, meal assignment
    - [ ] Dietary restrictions summary
    - [ ] Editable mode with actions

### Phase 5: Routing Algorithm & UI

**Goal**: Assign routes to dinner groups

15. **RoutingService**
    - [ ] Create `src/services/RoutingService.ts`
    - [ ] Port algorithm from `extensions/running-dinner/src/algorithms/routing.ts`
    - [ ] Adapt input/output:
      - Input: `DinnerGroup[]`
      - Look up addresses from ChurchTools Person data
      - Output: `Route[]`
    - [ ] Add unit tests (optional)

16. **RouteAssignment Component**
    - [ ] Copy `src/components/RouteAssignment.vue` from running-dinner
    - [ ] "Assign Routes" button → Calls RoutingService
    - [ ] Display routes with timeline view
    - [ ] Manual reset option
    - [ ] Save → Store Route[] in KV, update status

17. **RouteCard Component**
    - [ ] Copy `src/components/RouteDisplay.vue` from running-dinner
    - [ ] Adapt to display Route with ChurchTools person data
    - [ ] Timeline view (3 stops)
    - [ ] Host addresses (from ChurchTools)
    - [ ] Google Maps links
    - [ ] Dietary restrictions
    - [ ] After party info

### Phase 6: Email Notifications

**Goal**: Generate and send route emails

18. **EmailService**
    - [ ] Create `src/services/EmailService.ts`
    - [ ] Implement `generateRouteEmail()`:
      - HTML template with:
        - Event details
        - Group members with contact info
        - Full route (3 stops)
        - Dietary restrictions
        - Google Maps links
        - After party info
      - Generate text fallback
    - [ ] Implement `sendEmail()`:
      - Research ChurchTools email API (e.g., `/events/send`)
      - For MVP: console.log email content
      - Future: Actual API call

19. **EmailPreview Component**
    - [ ] Create `src/components/EmailPreview.vue`
    - [ ] Modal with email preview (HTML rendering)
    - [ ] "Send Test Email" button (to organizer)
    - [ ] "Send to All" button → Calls EmailService for each dinner group
    - [ ] Success toast with count

20. **Integration**
    - [ ] Add "Send Notifications" button to Routes tab
    - [ ] Opens EmailPreview modal
    - [ ] Batch send to all dinner groups

### Phase 7: CT-Native Features & Services (NEW)

**Goal**: Implement new CT-native features discovered in API research

21. **RoutineService**
    - [ ] Create `src/services/RoutineService.ts`
    - [ ] Implement `createWelcomeEmailRoutine()`:
      - POST /api/routines with domainType: "group"
      - Configure trigger: "joining_group"
      - Set email template with placeholders
    - [ ] Implement `updateRoutineSteps()`:
      - PATCH /api/routines/{id} to add email step
    - [ ] Implement `enableRoutine()`:
      - Validate steps work
      - Enable routine
    - [ ] Optional: Implement routine for waitlist promotion notification

22. **AddressService**
    - [ ] Create `src/services/AddressService.ts`
    - [ ] Implement `setAfterPartyLocation()`:
      - POST /api/addresses/group/{groupId}
      - Store address for after-party venue
    - [ ] Implement `getAfterPartyLocation()`:
      - GET /api/addresses/group/{groupId}
    - [ ] Integrate into EventCreator form

23. **SyncService**
    - [ ] Create `src/services/SyncService.ts`
    - [ ] Implement `syncOnLoad()`:
      - Compare KV store EventMetadata with CT groups
      - Delete orphaned KV entries (CT group deleted externally)
      - Return sync results
    - [ ] Implement `deleteEvent()`:
      - Delete CT group
      - Clean up all related KV data
    - [ ] Implement `archiveEvent()`:
      - Set CT group to archived status
      - Preserve KV data for historical access
    - [ ] Run sync on extension load

24. **Enhanced EventCreator**
    - [ ] Update `src/components/EventCreator.vue` with new fields:
      - Leiter selection (required - person dropdown)
      - Waitlist settings (enable, max size, auto move-up)
      - Co-registration settings (spouse, other)
      - Registration date range (open/close dates)
      - After-party address fields
    - [ ] Call AddressService when after-party configured
    - [ ] Optionally call RoutineService for welcome email

25. **Archive/Delete UI**
    - [ ] Create `src/components/EventActions.vue`:
      - Archive confirmation dialog
      - Delete confirmation dialog (requires typing event name)
      - Restore from archive action
    - [ ] Add "Archived" filter/tab to event list
    - [ ] Add action menu to EventCard

## Open Questions & Decisions

### 1. Parent Group Discovery

**Question**: How to identify the "Running Dinner" parent group?

**Options**:

- A) Hardcode group name "Running Dinner"
- B) Store parent group ID in extension settings
- C) Create parent group automatically on first use

**Decision**: Option C with user interaction - Check for parent group on load, show UI wizard to create if missing.

**Implementation**:

- Extension checks for "Running Dinner" group on startup
- If not found: Shows warning banner and "Create Parent Group" button
- User selects leaders and clicks create
- Extension creates group with proper configuration (Dienst type, no joining, roles)
- Parent group ID stored in extension state

### 2. Custom Field Management

**Question**: Who creates custom group-member fields?

**Options**:

- A) Extension creates fields automatically for each child group
- B) Extension creates fields once on parent group (inherited by children)
- C) Manual setup by admin

**Recommendation**: Option A - Auto-create fields on child group creation for isolation

### 3. Permissions

**Question**: Who can use the extension (organizer role)?

**Options**:

- A) All users (no restriction)
- B) ChurchTools admins only
- C) Members of parent "Running Dinner" group (with leader role)

**Recommendation**: Option C - Group leaders of parent group (aligns with ChurchTools permissions)

**Implementation**: Will be handled by the ChurchTools store checking group roles.

### 4. Email Sending

**Question**: How to send emails?

**Options**:

- A) Use ChurchTools email API (e.g., `/events/send`)
- B) Generate email content, organizer copies to email client
- C) Use external email service (SendGrid, etc.)

**Recommendation**:

- **Phase 1 (MVP)**: Option B - Console log email content, organizer manually sends
- **Phase 2**: Option A - Research and implement ChurchTools email API

### 5. Group Size Flexibility

**Question**: Should algorithm enforce strict group size?

**Decision**: Yes, strict enforcement. Excess participants go to waitlist for manual handling by organizer.

### 6. Meal Preferences

**Question**: Are meal preferences mandatory?

**Decision**: Preferences are preferences, not choices. Algorithm will force meal assignment if needed to balance groups.

### 7. Data Migration

**Question**: Should we support migrating data from old `running-dinner` extension?

**Decision**: No. This is a clean new extension. Users can run both in parallel if needed.

### 8. Future Widget Support

**Question**: How to prepare for future widget architecture?

**Decision**:

- Keep all logic in services and stores (no UI coupling)
- Stores export composables that widgets can import
- Components should be small and reusable
- Avoid direct DOM manipulation

**Example Widget Use Cases**:

- Widget in ChurchTools group detail page showing event metadata
- Widget in ChurchTools person profile showing their dinner group & route
- Widget in ChurchTools calendar showing running dinner events

### 9. Address Validation

**Question**: Should we validate that members have addresses?

**Decision**: Yes. Show warning if members are missing addresses. Block route assignment until resolved.

### 10. Dietary Restrictions Visibility

**Question**: Who can see dietary restrictions?

**Decision**: All members of the same dinner group can see each other's restrictions (needed for meal planning). Organizer sees all.

## Technical Considerations

### ChurchTools API Rate Limiting

- Implement caching for group member data
- Batch API calls where possible
- Show loading states during API calls
- Handle rate limit errors gracefully

### Data Consistency

- EventMetadata in KV store references ChurchTools group ID
- DinnerGroups reference ChurchTools person IDs
- **CT group is source of truth** - if deleted in CT, KV data is orphaned
- **SyncService** runs on extension load to clean up orphaned KV data:
  - Checks if CT groups still exist for each EventMetadata
  - Deletes orphaned EventMetadata, DinnerGroups, and Routes
  - Returns sync report (deleted count, errors)
- **Archive vs Delete**:
  - Archive: CT groupStatusId = 3, KV data preserved (read-only historical access)
  - Delete: CT group deleted, KV data cleaned up by SyncService

## Migration from Old Extension

Users can:

1. Keep old `running-dinner` extension for historical events
2. Use new `running-dinner-groups` extension for new events
3. No automatic migration needed (separate data stores)

## Future Enhancements

### Phase 8+ (Post-MVP)

1. **Participant Widgets**
   - Widget for ChurchTools group page showing event details
   - Widget for person profile showing their route
   - Widget for calendar integration

2. **Advanced Features**
   - Geographic clustering (optimize routes by location)
   - Carpool coordination
   - Recipe sharing
   - Photo gallery
   - Post-event survey/feedback

3. **Notifications**
   - SMS notifications (via ChurchTools)
   - Push notifications (if CT supports)
   - Reminder emails (1 day before event)

4. **Reporting**
   - Export participant list (CSV)
   - Export routes (PDF)
   - Post-event analytics

5. **Multi-Event Support**
   - Event series (monthly running dinners)
   - Template events (reuse configuration)
   - Recurring group creation

## Current Status Summary

### Phase Status

- Phase 1: ✅ Complete (Foundation & Setup)
- Phase 2: ✅ Complete (Group Configuration Service)
- Phase 3: 🔄 In Progress (Event Management UI)
- Phase 4: 🔜 Not Started (Grouping Algorithm & UI)
- Phase 5: 🔜 Not Started (Routing Algorithm & UI)
- Phase 6: 🔜 Not Started (Email Notifications)
- Phase 7: 🔜 Not Started (CT-Native Features & Services) **NEW**
- Phase 8+: 🔜 Future (Polish, Widgets, Advanced Features)

### Overall Progress: ~30% (Phase 1 & 2 Complete, Phase 3 Ongoing)

### What's Been Completed

**Phase 1: Foundation ✅**

- Project structure and configuration
- Data models with Zod schemas (EventMetadata, DinnerGroup, Route)
- KV store setup for all 3 categories
- ChurchTools store with real API implementations

**Phase 2: Group Configuration Service ✅**

- `GroupConfigService.ts` with all methods implemented:
  - Parent group checking and creation
  - Child group creation with auto-configuration
  - Custom field management (mealPreference, dietaryRestrictions, allergyInfo, partnerPreference)
  - Group settings updates
  - Leader management
- Enhanced ChurchTools store with:
  - Real API calls for all operations
  - Automatic pagination for members
  - Response normalization helper
  - Group types and roles queries
- `ParentGroupSetup.vue` component:
  - Warning banner for missing parent group
  - Permission checking (user must be leader)
  - Parent group creation wizard
  - Leader/co-leader selection
  - Settings preview

**Phase 3: Event Management UI (In Progress) 🔄**

- ✅ `ParentGroupSetup.vue` complete
- ✅ `OrganizerView.vue` updated:
  - Integrated ParentGroupSetup component
  - Permission-based rendering (only leaders can see main UI)
  - Event list with child group names
  - Status badges with color coding
  - Event cards with basic info display
  - Integrated EventCreator component
- ✅ `EventCreator.vue` complete:
  - Full form with Zod validation
  - Basic information (name, description, date)
  - Configuration (max participants, group size)
  - **Partner preferences toggle** (organizer can enable/disable)
  - Menu timing (starter, main course, dessert)
  - Optional after party section
    - **Dessert at after party location** (checkbox when after party enabled)
  - Integration with GroupConfigService
  - Toast notifications for success/error
  - Conditional custom field creation based on settings
- ⏳ `EventCard.vue` or detail modal - next task

### Next Steps

**Immediate (Phase 3 completion):**

1. ✅ ~~Update `OrganizerView.vue` to integrate ParentGroupSetup and show event list~~
2. ✅ ~~Create `EventCreator.vue` component with event creation form~~
3. Create event detail modal with tabs (can be in OrganizerView or separate EventCard component)

**Then (Phase 3 remaining):** 4. Create `MemberList.vue` component 5. Implement open/close registration actions

### Technical Implementation Details

**Data Flow:**

- ChurchTools Groups API → Group members, settings, fields
- KV Store (PersistanceCategory) → EventMetadata, DinnerGroups, Routes
- GroupConfigService → Orchestrates ChurchTools API calls
- Pinia stores → State management for UI components

**API Integration:**

- Using `@churchtools/churchtools-client` for all ChurchTools API calls
- Response normalization handles both array and `{ data: [] }` formats
- Automatic pagination for member lists (10 per page)
- DELETE operations use `churchtoolsClient.deleteApi()`
- All ChurchTools store methods have loading/error states

**Components Structure:**

```
src/
├── services/
│   └── GroupConfigService.ts ✅
├── components/
│   ├── ParentGroupSetup.vue ✅
│   ├── EventCreator.vue ⏳
│   ├── EventCard.vue ⏳
│   └── MemberList.vue ⏳
├── stores/
│   ├── churchtools.ts ✅ (enhanced)
│   ├── eventMetadata.ts ✅
│   ├── dinnerGroup.ts ✅
│   └── route.ts ✅
├── types/
│   └── models.ts ✅ (updated with Person, enhanced GroupMember)
└── views/
    └── OrganizerView.vue ✅ (updated)
```

### Key Differences from Old Extension

| Aspect              | Old Extension        | New Extension                    |
| ------------------- | -------------------- | -------------------------------- |
| Participant Data    | Extension KV Store   | ChurchTools Groups               |
| Registration UI     | Custom Vue forms     | ChurchTools native               |
| Group Management    | Extension UI         | ChurchTools groups               |
| Waitlist            | Manual in extension  | ChurchTools built-in             |
| Custom Fields       | Extension data model | CT group-member fields           |
| Data Storage        | 4 KV categories      | 3 KV categories + CT groups      |
| User Roles          | All users            | Group leaders only               |
| Participant UI      | Full views           | None (CT native)                 |
| Event Status        | Extension-managed    | CT groupStatusId (native)        |
| Registration Dates  | Manual open/close    | CT signUpOpeningDate/ClosingDate |
| Spouse Registration | Not supported        | CT allowSpouseRegistration       |
| Welcome Emails      | Not supported        | CT Routines (optional)           |
| Event Locations     | Extension storage    | CT Addresses API                 |
| Visibility          | Extension setting    | CT visibility (intern)           |

### Advantages of New Approach

✅ **ChurchTools Native**: Participants use familiar ChurchTools UI
✅ **Less Code**: No participant registration/management UI needed
✅ **Better Integration**: Leverages CT's existing features (waitlist, permissions, fields)
✅ **Cleaner Separation**: Extension is purely organizer tools
✅ **Future-Proof**: Architecture supports widget use cases
✅ **Data Ownership**: Participant data lives in ChurchTools, not extension
✅ **Less Maintenance**: ChurchTools handles user management, validation, etc.

## Notes

- All algorithms from old extension are reusable with minor adaptations
- Most Vue components can be adapted (GroupBuilder, GroupCard, RouteAssignment, etc.)
- Stores need restructuring to work with ChurchTools API instead of KV store for participant data
- Services layer is new (GroupConfigService, GroupingService, RoutingService, EmailService)
- Extension key: `running-dinner-groups`
- Parent group management:
  - Name: "Running Dinner" (checked/created on first load)
  - Type: "Dienst" (Service group)
  - Roles: Only "Leiter" and "Co-Leiter" active (all other roles deactivated)
  - Settings: No joining allowed (`isOpenForMembers: false`), not public
  - Permissions: Any active member can use organizer features (checked via groupMemberStatus === 'active')
- Child group pattern: "Running Dinner - [Event Name]"

### ChurchTools API Notes for Role Management

**Group Type Roles**: Each group type in ChurchTools has predefined roles (Leiter, Co-Leiter, Teilnehmer, etc.). When creating a parent group:

1. Query group type ID for "Dienst" (Service) via `GET /group/grouptypes`
2. Get available roles via `GET /group/roles` and filter by `groupTypeId`
3. Assign members to "Leiter" and "Co-Leiter" roles using `PUT /groups/{id}/members/{personId}` with `groupTypeRoleId`
4. To "deactivate" other roles: Simply don't assign anyone to them
5. Permission check: User just needs to be an active member (groupMemberStatus === 'active'), not necessarily a Leiter

**API Endpoints Needed**:

- `GET /groups/{id}/members` - List current members and their roles
- `PUT /groups/{id}/members/{personId}` - Add/update member with specific role (body: `{groupTypeRoleId, groupMemberStatus}`)
- `DELETE /groups/{id}/members/{personId}` - Remove member
- `GET /group/grouptypes` - Get available group types (find "Dienst" ID)
- `GET /group/roles` - Get all roles (filter by `groupTypeId` client-side)
- `POST /groups` - Create group (requires: `name`, `groupTypeId`, `groupStatusId` where 1=pending, 2=active)
- `PATCH /groups/{id}` - Update group settings (groupStatusId, isOpenForMembers, etc.)
- `DELETE /groups/{id}` - Delete group (source of truth deletion)

**New CT-Native API Endpoints (Phase 7)**:

- `GET /api/routines?domainType=group&domainIdentifier={groupId}` - Get routines for a group
- `POST /api/routines` - Create routine (welcome email on join)
- `PATCH /api/routines/{id}` - Update routine (add steps, enable)
- `POST /api/routines/{id}/steps/validate` - Validate routine steps work
- `GET /api/addresses/group/{groupId}` - Get group addresses (after-party location)
- `POST /api/addresses/group/{groupId}` - Create group address
- `GET /persons?query={query}` - Search persons (for Leiter dropdown)

---

## Design Decisions Summary (from lifecycle-and-state.md)

Key decisions made during API research and design phase:

| Feature                    | Decision                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **Event Status**           | Use CT-native `groupStatusId`: 1=pending, 2=active, 3=archived, 4=finished              |
| **Visibility**             | Always `intern` for MVP (no public events)                                              |
| **Registration**           | Use CT-native `isOpenForMembers` + `signUpOpeningDate`/`signUpClosingDate`              |
| **Waitlist**               | Use CT-native `allowWaitinglist`, `waitinglistMaxPersons`, `automaticMoveUp`            |
| **Waitlist Notifications** | `automaticMoveUp` doesn't notify - need Routine or manual notification                  |
| **Co-Registration**        | Use CT-native `allowSpouseRegistration`, `allowOtherRegistration`                       |
| **Partner Preferences**    | Keep custom field (user may want different partner than spouse)                         |
| **Routines**               | Fully API-controllable! Use for welcome emails on group join                            |
| **Addresses**              | Use `/api/addresses/group/{groupId}` for after-party location                           |
| **Leader Requirement**     | Groups MUST have Leiter assigned for members to join!                                   |
| **Error Handling**         | Preemptive validation + toast notifications (no retry queue for MVP)                    |
| **Archive vs Delete**      | Archive = hidden but restorable (groupStatusId=3), Delete = permanent with confirmation |
| **KV Data Retention**      | Preserved on archive (read-only), cleaned up by SyncService when CT group deleted       |

See `lifecycle-and-state.md` for full details on each decision.
