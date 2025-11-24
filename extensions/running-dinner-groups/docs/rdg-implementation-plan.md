# Running Dinner Groups Extension - Implementation Plan

## Implementation Status

**Last Updated**: November 24, 2025

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

### 🚧 In Progress / TODO

#### Vue Components (Remaining)

- [ ] `EventCard.vue` - Event display card
- [ ] `EventCreator.vue` - Event creation modal
- [ ] `MemberList.vue` - Group member list with filters
- [ ] `DinnerGroupBuilder.vue` - Dinner group creation UI
- [ ] `DinnerGroupCard.vue` - Individual dinner group display
- [ ] `RouteAssignment.vue` - Route assignment UI
- [ ] `RouteCard.vue` - Individual route display
- [ ] `EmailPreview.vue` - Email preview and sending

#### Main Views

- [ ] `OrganizerView.vue` - Main dashboard
  - Event list
  - Workflow orchestration
  - Status management

#### Testing & Integration

- [ ] End-to-end workflow testing
- [ ] Parent group creation flow
- [ ] Event creation flow
- [ ] Dinner group algorithm testing
- [ ] Route assignment algorithm testing
- [ ] Email generation testing

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

### Status & Lifecycle Management

**ChurchTools manages** (via group settings):

- `isOpenForMembers`: Whether participants can join (toggle via extension UI)
- `isPublic`: Whether group is publicly visible
- `isHidden`: Whether group is hidden
- `isArchived`: End-of-life state (managed in ChurchTools)

**Extension tracks** (in EventMetadata KV store):

- `status`: Workflow progress (`'active'` → `'groups-created'` → `'routes-assigned'` → `'notifications-sent'` → `'completed'`)
- Only tracks extension-specific workflow, not ChurchTools group state

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

1. **Waitlist**: Enabled with configurable max members
2. **Registration Settings**:
   - `isOpenForMembers: true` (allow joining)
   - `maxMembers: <configurable>` (e.g., 30)
   - `allowWaitinglist: true`
   - `signUpOpeningDate` & `signUpClosingDate` (optional)
3. **Required Group Member Fields**:
   - Standard ChurchTools person fields (name, email, phone, address) - marked as required
4. **Custom Group-Member Fields** (to be created):
   - `mealPreference` (select: starter | mainCourse | dessert | none)
   - `dietaryRestrictions` (textarea)
   - `allergyInfo` (textarea)
   - `partnerPreference` (text - comma-separated emails or names)
   - All marked as `requiredInRegistrationForm: true`

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
  };

  // Configuration
  preferredGroupSize: number; // Default: 2 (couples)

  // Status tracking (extension workflow only)
  status:
    | 'active' // Event active, no dinner groups yet (ChurchTools handles registration via isOpenForMembers)
    | 'groups-created' // Meal groups assigned
    | 'routes-assigned' // Routes created but emails not sent
    | 'notifications-sent' // Route emails sent to participants
    | 'completed'; // Event finished (manual transition)

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
│   └── implementation-plan.md
├── src/
│   ├── App.vue                      # Main app (single organizer view)
│   ├── config.ts                    # Extension key
│   ├── main.ts                      # App initialization
│   ├── stores/
│   │   ├── eventMetadata.ts        # Event metadata CRUD
│   │   ├── dinnerGroup.ts          # Dinner group CRUD
│   │   ├── route.ts                # Route CRUD
│   │   └── churchtools.ts          # ChurchTools API wrapper (groups, members, fields)
│   ├── services/
│   │   ├── GroupConfigService.ts   # Auto-configure child groups
│   │   ├── GroupingService.ts      # Grouping algorithm (reuse from old extension)
│   │   ├── RoutingService.ts       # Routing algorithm (reuse from old extension)
│   │   └── EmailService.ts         # Email generation & sending
│   ├── views/
│   │   └── OrganizerView.vue       # Main organizer dashboard
│   ├── components/
│   │   ├── ParentGroupSetup.vue    # Parent group creation wizard
│   │   ├── EventCard.vue           # Display event (child group)
│   │   ├── EventCreator.vue        # Create new event from group
│   │   ├── MemberList.vue          # Display group members
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
    // 1. Create group via ChurchTools API:
    const groupData = {
      name: 'Running Dinner',
      groupTypeId: <DIENST_TYPE_ID>, // Service/Dienst type
      groupStatusId: <ACTIVE_STATUS_ID>,
      information: {
        note: 'Parent group for organizing Running Dinner events. Managed by extension.',
        groupCategoryId: null,
        campusId: null,
      },
      settings: {
        isOpenForMembers: false,      // No direct joining
        isPublic: false,              // Not public
        isHidden: false,              // Visible to members
        allowWaitinglist: false,      // No waitlist needed
        maxMembers: null,             // No limit
        inStatistic: false,           // Don't include in stats
      },
    };

    // 2. Create group
    // 3. Assign Leiter role to leader
    // 4. Assign Co-Leiter role(s) to co-leaders
    // 5. Deactivate all other group type roles
    // 6. Store parent group ID in extension KV store metadata
    // 7. Return created group
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
   */
  assignRoutes(
    eventMetadata: EventMetadata,
    dinnerGroups: CategoryValue<DinnerGroup>[],
    members: GroupMember[], // For address lookup
  ): RoutingResult {
    // Reuses logic from: extensions/running-dinner/src/algorithms/routing.ts
    // 1. Validate groups have balanced meal assignments
    // 2. Use backtracking algorithm to assign routes
    // 3. Populate addresses from ChurchTools person data
    // 4. Return routes
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
   - Event name (e.g., "Running Dinner - December 2025")
   - Description
   - Event date
   - Max participants (default: 30)
   - Preferred group size (default: 2)
   - Menu timings (start/end for each meal)
   - Optional: After party details
4. Click "Create" → Extension:
   - Creates ChurchTools child group
   - Configures settings: `isOpenForMembers: false` initially, waitlist enabled, max members
   - Creates custom fields
   - Creates EventMetadata in KV store
   - Sets status to 'active'
5. Success toast → Event appears in list

#### 2. Open/Close Registration

1. Find event in list (ChurchTools group controls registration)
2. Click "Open Registration" (if `isOpenForMembers: false`)
   - Extension updates group: `isOpenForMembers = true`
   - Success toast → Participants can now join via ChurchTools
3. Or click "Close Registration" (if `isOpenForMembers: true`)
   - Extension updates group: `isOpenForMembers = false`
   - Success toast → No new joins allowed (waiting list still works)

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
3. Extension updates EventMetadata status to 'completed'
4. Event can be archived in ChurchTools separately (using CT's archive feature)

### Participant Flow (ChurchTools Native)

Participants never use the extension UI. They interact via ChurchTools:

1. **Discover Event**: Browse ChurchTools groups, see "Running Dinner - December 2025"
2. **Join Group**: Click "Join" in ChurchTools
3. **Fill Registration Form**: ChurchTools presents form with required fields:
   - Standard: Name, email, phone, address (pre-filled from profile)
   - Custom: Meal preference, dietary restrictions, partner preference
4. **Submit**: ChurchTools saves as group member
5. **Waitlist**: If max reached, automatically placed on waitlist
6. **Receive Email**: After routes assigned, receives personalized email with:
   - Group members and contact info
   - Full route (3 stops)
   - Dietary restrictions of guests
   - Google Maps links
   - After party details

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
- Status badge (color-coded)
- Member count (active / max)
- Quick actions: Publish, Close Registration, Delete (based on status)

### EventCreator.vue

Modal dialog with form:

- Event details (name, description, date)
- Configuration (max members, group size)
- Menu timing
- After party (optional)
- Validation with Zod
- Submit → Calls GroupConfigService

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
  }

  async function updateGroup(
    groupId: number,
    data: Partial<Group>,
  ): Promise<void> {
    // PUT /groups/{id}
  }

  async function deleteGroup(groupId: number): Promise<void> {
    // DELETE /groups/{id}
  }

  // ===== MEMBERS =====

  async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
    // GET /groups/{id}/members (paginated)
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

  return {
    getParentGroup,
    getChildGroups,
    createChildGroup,
    updateGroup,
    deleteGroup,
    getGroupMembers,
    getGroupMemberFields,
    createGroupMemberField,
    getCurrentUser,
    getPerson,
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
   - [ ] Create `src/components/EventCreator.vue`
   - [ ] Form with validation (Zod):
     - Event name, description, date
     - Max members, group size
     - Menu timing
     - After party (optional)
   - [ ] Call GroupConfigService on submit
   - [ ] Show success/error toasts

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
   - [ ] Update `src/views/OrganizerView.vue`
   - [ ] Integrate ParentGroupSetup component
   - [ ] Conditional rendering based on parent group status:
     - If missing: Show ParentGroupSetup
     - If exists & user is leader: Show main UI
     - If exists & user is not leader: Show permission error
   - [ ] "Create New Event" button → Opens EventCreator (disabled until parent exists)
   - [ ] Fetch and display child groups
   - [ ] EventCard component (basic)

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

11. **Status Management**
    - [ ] Implement publish action:
      - Update group `isOpenForMembers = true`
      - Update EventMetadata status to 'published'
      - Confirmation dialog
    - [ ] Implement close registration action:
      - Update group `isOpenForMembers = false`
      - Update EventMetadata status to 'registration-closed'
      - Confirmation dialog
    - [ ] Status badges and conditional actions

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
- If group is deleted in ChurchTools, handle orphaned KV data
- Implement soft delete or cleanup logic

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
- Phase 7: 🔜 Not Started (Polish & Testing)

### Overall Progress: ~25% (Phase 1 & 2 Complete, Phase 3 Started)

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
- ⏳ `EventCreator.vue` - not started
- ⏳ `OrganizerView.vue` - needs update

### Next Steps

**Immediate (Phase 3 completion):**

1. Create `EventCreator.vue` component with event creation form
2. Update `OrganizerView.vue` to integrate ParentGroupSetup and show event list
3. Create basic `EventCard.vue` component for displaying events

**Then (Phase 3 remaining):** 4. Create event detail modal with tabs 5. Create `MemberList.vue` component 6. Implement open/close registration actions

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
    └── OrganizerView.vue ⏳ (needs update)
```

### Key Differences from Old Extension

| Aspect           | Old Extension        | New Extension               |
| ---------------- | -------------------- | --------------------------- |
| Participant Data | Extension KV Store   | ChurchTools Groups          |
| Registration UI  | Custom Vue forms     | ChurchTools native          |
| Group Management | Extension UI         | ChurchTools groups          |
| Waitlist         | Manual in extension  | ChurchTools built-in        |
| Custom Fields    | Extension data model | CT group-member fields      |
| Data Storage     | 4 KV categories      | 3 KV categories + CT groups |
| User Roles       | All users            | Group leaders only          |
| Participant UI   | Full views           | None (CT native)            |

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
  - Permissions: Only leaders can create events and use organizer features
- Child group pattern: "Running Dinner - [Event Name]"

### ChurchTools API Notes for Role Management

**Group Type Roles**: Each group type in ChurchTools has predefined roles (Leiter, Co-Leiter, Teilnehmer, etc.). When creating a parent group:

1. Query group type ID for "Dienst" (Service)
2. Get available roles for that group type
3. Assign members to "Leiter" and "Co-Leiter" roles using `groupTypeRoleId`
4. To "deactivate" other roles: Simply don't assign anyone to them (or ensure role settings prevent auto-assignment)

**API Endpoints Needed**:

- `GET /groups/{id}/members` - List current members and their roles
- `POST /groups/{id}/members` - Add member with specific role
- `PUT /groups/{id}/members/{memberId}` - Update member role
- `GET /grouptypes` - Get available group types (find "Dienst" ID)
- `GET /grouptypes/{id}/roles` - Get roles for a group type
