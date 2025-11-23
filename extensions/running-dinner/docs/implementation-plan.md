# Running Dinner Extension - Implementation Plan

## Overview

This document outlines the complete implementation plan for the Running Dinner extension for ChurchTools. Based on the requirements in `all-the-things.md` and learnings from the translator extension, this plan details the architecture, data models, views, algorithms, and implementation steps.

## Architecture Overview

### Technology Stack

- **Framework**: Vue 3 + TypeScript (matching translator)
- **State Management**: Pinia stores
- **UI Components**: PrimeVue via `@churchtools-extensions/prime-volt`
- **Styling**: Tailwind CSS
- **Data Persistence**: `@churchtools-extensions/persistance` (PersistanceCategory)
- **ChurchTools Integration**: `@churchtools/churchtools-client`

### Application Structure

```
extensions/running-dinner/
├── src/
│   ├── App.vue                    # Main app with tabs
│   ├── config.ts                  # Extension key configuration
│   ├── main.ts                    # App initialization
│   ├── stores/
│   │   ├── runningDinner.ts      # Running dinner CRUD & algorithms
│   │   └── participant.ts         # Participant management
│   ├── views/
│   │   ├── OrganizerView.vue     # Organizer dashboard (main view)
│   │   └── ParticipantView.vue   # Unified view for browsing & registration
│   ├── components/
│   │   ├── DinnerCard.vue        # Display a dinner event
│   │   ├── DinnerForm.vue        # Create/edit dinner form
│   │   ├── ParticipantForm.vue   # Participant registration form
│   │   ├── ParticipantList.vue   # List of participants
│   │   ├── GroupBuilder.vue      # Group creation interface
│   │   ├── GroupCard.vue         # Display group info
│   │   ├── RouteAssignment.vue   # Meal route assignment
│   │   └── RouteDisplay.vue      # Display route for participants
│   ├── algorithms/
│   │   ├── grouping.ts           # Group creation algorithm
│   │   └── routing.ts            # Route assignment algorithm
│   └── types/
│       └── models.ts             # TypeScript interfaces
```

## Data Models

### 1. Running Dinner Event (`RunningDinner`)

```typescript
interface RunningDinner {
  id: number; // Category value ID
  name: string;
  description: string;
  date: string; // ISO date
  city: string;
  maxParticipants: number;
  allowPreferredPartners: boolean;
  publicSingleSignins: boolean; // Show single registrations publicly
  preferredGroupSize: number; // Default: 2
  allowPreferredMeal: boolean; // Allow meal preferences
  registrationDeadline: string; // ISO date

  // Menu configuration
  menu: {
    starter: { startTime: string; endTime: string };
    mainCourse: { startTime: string; endTime: string };
    dessert: { startTime: string; endTime: string };
  };

  // Optional after party
  afterParty?: {
    time: string;
    location: string;
  };

  // Additional info
  participantInfo?: string; // Text field for organizer notes

  // Status tracking
  status:
    | 'draft'
    | 'published'
    | 'registration-closed'
    | 'groups-created'
    | 'routes-assigned'
    | 'completed';

  // Metadata
  organizerId: number; // ChurchTools person ID
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  publishedAt?: string; // ISO timestamp
}
```

### 2. Participant Registration (`Participant`)

```typescript
interface Participant {
  id: number; // Category value ID
  dinnerId: number; // Reference to RunningDinner

  // Personal info
  personId?: number; // ChurchTools person ID (if logged in)
  name: string;
  email: string;
  phone: string;

  // Address
  address: {
    street: string;
    zip: string;
    city: string;
  };

  // Preferences
  preferredPartners: string[]; // Array of email addresses
  preferredMeal?: 'starter' | 'mainCourse' | 'dessert';
  dietaryRestrictions: string; // Text field

  // Status
  // - 'confirmed': Default status for new registrations (auto-confirmed)
  // - 'waitlist': Participant exceeded max capacity
  // - 'cancelled': Participant cancelled their registration
  registrationStatus: 'confirmed' | 'waitlist' | 'cancelled';
  groupId?: number; // Assigned group (set after grouping)

  // Metadata
  registeredAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

### 3. Group (`Group`)

```typescript
interface Group {
  id: number; // Category value ID
  dinnerId: number; // Reference to RunningDinner
  groupNumber: number; // Human-readable group number (1, 2, 3...)

  // Members
  participantIds: number[]; // References to Participants

  // Meal assignments
  assignedMeal?: 'starter' | 'mainCourse' | 'dessert';
  hostParticipantId?: number; // Which participant hosts this meal

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

### 4. Route (`Route`)

```typescript
interface Route {
  id: number; // Category value ID
  dinnerId: number; // Reference to RunningDinner
  groupId: number; // Reference to Group

  // Route stops (in order)
  stops: Array<{
    meal: 'starter' | 'mainCourse' | 'dessert';
    hostGroupId: number; // Which group is hosting this meal
    hostAddress: {
      street: string;
      zip: string;
      city: string;
    };
    startTime: string;
    endTime: string;
  }>;

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

## Data Persistence Strategy

### Categories

1. **`running-dinners`** - Stores `RunningDinner` records
2. **`participants`** - Stores `Participant` records
3. **`groups`** - Stores `Group` records
4. **`routes`** - Stores `Route` records

### Access Control

- **Organizers**: Identified via ChurchTools permissions (to be determined)
  - Create/edit/delete dinners
  - View all participants
  - Create groups and routes
  - Publish events
- **Participants**: All authenticated ChurchTools users
  - View published dinners
  - Register for dinners
  - View their own registration and route

## Views & User Flows

### 1. Organizer View (Main Tab)

**Purpose**: Complete organizer dashboard for managing running dinners

**Components**:

- Event list with status indicators
- Create/Edit event form
- Participant list with filters
- Group builder interface
- Route assignment interface
- Publish/notification controls

**User Flow**:

1. Create new dinner → Fill form → Save as draft
2. Edit dinner → Publish (makes visible to participants)
3. Monitor registrations
4. Close registration (manual action required)
5. Create groups (only available after registration is closed)
6. Assign meal routes (only available after groups are created)
7. Send email notifications to participants

### 2. Participate View (Single Unified Tab)

**Purpose**: Browse all published dinners and manage your registrations

**Components**:

- Card list of all published dinners
- Each card shows:
  - Dinner details
  - Participant count
  - Registration status indicator (if already registered)
  - Action button: "Join" or "Already Registered" (with edit option)
- Registration form
- Route display (after routes are assigned)

**User Flow**:

1. Browse all published dinners in one view
2. See which dinners you're already registered for (badge/indicator)
3. Click "Join" on available dinners (only when status is 'published') → Fill registration form
4. View your registration details
5. Edit registration (only before groups are created)
6. Cancel registration:
   - Before groups created: simple cancellation
   - After groups created: warning about organizer notification and manual group adjustments
7. After routes published → View group members and route details

## Core Algorithms

### 1. Group Creation Algorithm (`algorithms/grouping.ts`)

**Objective**: Create balanced groups respecting preferences

**Algorithm**:

```
function createGroups(dinner: RunningDinner, participants: Participant[]): Group[]

1. Filter: Remove waitlist/cancelled participants from algorithm input

2. Validate participants:
   - minParticipants = 3 meals × preferredGroupSize (e.g., 6 for group size 2)
   - if participants.length < minParticipants:
     - return error: "Need at least X participants"
   - Calculate ideal group count: Must be multiple of 3 (3, 6, 9, 12...)
   - if participants.length doesn't match ideal count:
     - Move excess participants to waitlist
     - Organizer can manually reassign later ("leave nobody behind")

3. Build preferred partner graph:
   - Create bidirectional edges for mutual preferences
   - Create unidirectional edges for one-sided preferences

4. Group formation (greedy approach):
   a. Start with strongly connected components (mutual preferences)
   b. For each component:
      - If size == preferredGroupSize: Create group
      - If size < preferredGroupSize: Try to add compatible singles
      - If size > preferredGroupSize: Flag as warning (manual split needed)

   c. Process remaining singles:
      - Try to match with other singles who prefer each other
      - Fill incomplete groups
      - Create new groups with remaining singles

5. Balance meal preferences:
   - Count groups willing to host each meal
   - Target: Equal number of groups per meal (totalGroups / 3)
   - Respect preferences where possible
   - **Force assignment if needed** - preferences are not choices
   - Ensure every group hosts exactly one meal

6. Return:
   - Array of groups
   - Array of warnings (group size issues, unmatched preferences, etc.)
```

**Edge Cases**:

- More participants than max → handled via waitlist
- Odd number of participants → algorithm handles variable group sizes
- Circular preference chains → greedy approach breaks cycles
- Groups with all same meal preference → force assignment as needed
- **Non-multiple-of-3 groups**: If participant count doesn't result in equal groups per meal (e.g., 20 participants = 10 groups, not divisible by 3), excess participants go to waitlist for manual handling by organizer

### 2. Route Assignment Algorithm (`algorithms/routing.ts`)

**Objective**: Assign meal routes ensuring no group meets twice and everyone eats in order

**Algorithm**:

```
function assignRoutes(dinner: RunningDinner, groups: Group[]): Route[]

1. Validate groups:
   - Each group must have an assignedMeal
   - Must have equal number of groups per meal (3 groups × 3 meals = 9 total groups minimum)
   - If unbalanced: return error

2. Group groups by meal:
   - starters = groups hosting starter
   - mainCourses = groups hosting main course
   - desserts = groups hosting dessert

3. Create constraint satisfaction problem:
   - Variables: For each group G, assign (starterHost, mainCourseHost, dessertHost)
   - Constraints:
     a. G's assigned meal host must be itself
     b. No group meets another group more than once
     c. Meals must be in order (starter → main → dessert)

4. Use backtracking algorithm:
```

function backtrack(groupIndex, assignments):
if groupIndex == groups.length:
return assignments // Success!

     currentGroup = groups[groupIndex]

     for each starter in starters:
       for each mainCourse in mainCourses:
         for each dessert in desserts:
           if valid(currentGroup, starter, mainCourse, dessert, assignments):
             assignments[currentGroup] = {starter, mainCourse, dessert}
             result = backtrack(groupIndex + 1, assignments)
             if result != null:
               return result

     return null  // Backtrack

```

5. Convert assignments to Route objects:
- For each group, create Route with 3 stops
- Look up host addresses from participants
- Include timing from menu configuration

6. Return routes or error if no solution found

**Optimization**: Use heuristics to try likely solutions first (e.g., geographic proximity)
```

**Edge Cases**:

- Impossible configurations (too few groups)
- Geographic clustering if possible
- Time constraints between meals

## Implementation Steps

### Phase 1: Foundation ✅ COMPLETED

**Goal**: Setup data models and basic CRUD operations

1. **Data Types**
   - [x] Create `src/types/models.ts` with all TypeScript interfaces
   - [x] Add Zod schemas for validation
   - [x] Export types for use across app

2. **Pinia Stores**
   - [x] Extend `runningDinner.ts` store:
     - Full CRUD for dinners
     - Status management methods
     - Publishing workflow
   - [x] Create `participant.ts` store:
     - CRUD for participants
     - Filter by dinnerId
     - Waitlist management
   - [x] Create `group.ts` store:
     - CRUD for groups
     - Link to participants
   - [x] Create `route.ts` store:
     - CRUD for routes
     - Query by dinnerId/groupId

3. **Persistance Setup**
   - [x] Initialize PersistanceCategory instances for all data types
   - [x] Test data persistence in development
   - [x] Implement error handling

4. **ChurchTools Integration**
   - [x] Fetch current user info
   - [x] Pre-populate participant form with user data (ready for implementation)
   - [x] Determine organizer permissions strategy (all users for now)

### Phase 2: Organizer Experience ⚡ IN PROGRESS

**Goal**: Complete organizer workflows

5. **Event Management** ✅ COMPLETED
   - [x] `DinnerForm.vue`: Create/edit dinner form
     - Basic info fields
     - Menu time configuration
     - Validation
   - [x] `DinnerCard.vue`: Display dinner with status
   - [x] OrganizerView: Event list and creation workflow
   - [x] Status transitions (draft → published → closed)

6. **Participant Management** ✅ COMPLETED
   - [x] `ParticipantList.vue`: Display participants
     - Filter by status
     - Show dietary restrictions
     - Waitlist indicator
   - [x] Show registration count vs. max
   - [x] Automatic waitlist when max exceeded (logic ready in stores)

7. **Group Builder** ✅ COMPLETED
   - [x] Implement `algorithms/grouping.ts`
   - [x] `GroupBuilder.vue`: Interface for group creation
     - "Create Groups" button
     - Display algorithm results
     - Show warnings (waitlist participants)
     - Allow manual adjustments:
       - Add participants to groups (via dropdown selection)
       - Move waitlist participants into groups
       - "Leave nobody behind" - manual inclusion of excess participants
       - Set group host
       - Remove members from groups
       - Delete empty groups
     - Save groups
     - Reset groups with confirmation
   - [x] `GroupCard.vue`: Display group with members

### Phase 3: Routing Algorithm ✅ COMPLETED

**Goal**: Implement route assignment

8. **Route Algorithm** ✅ COMPLETED
   - [x] Implement `algorithms/routing.ts`
   - [x] Write unit tests for edge cases (deferred)
   - [x] Performance optimization (deferred)

9. **Route Assignment UI** ✅ COMPLETED
   - [x] `RouteAssignment.vue`: Interface for route creation
     - "Assign Routes" button
     - Display routes
     - Show conflicts/errors
     - Allow manual override if needed (basic reset functionality)
   - [x] `RouteDisplay.vue`: Beautiful route card
     - Timeline view
     - Addresses
     - Map links (Google Maps)

10. **Validation & Testing** ⏸️ DEFERRED
    - [ ] Test with various participant counts
    - [ ] Test edge cases (odd numbers, unbalanced preferences)
    - [ ] Ensure algorithm handles all scenarios

### Phase 4: Participant Experience ✅ COMPLETED

**Goal**: Complete participant workflows

11. **Registration Flow** ✅ COMPLETED
    - [x] `ParticipantForm.vue`: Registration form
      - Pre-populate from ChurchTools user
      - Preferred partners (email input with validation)
      - Meal preferences
      - Dietary restrictions
    - [x] Form validation
    - [x] Edit registration (until deadline)
    - [x] Cancellation option (with reusable cancelled records for organizer history)

12. **Participant Dashboard** ✅ COMPLETED
    - [x] ParticipantView.vue:
      - Unified view showing all published dinners
      - "Registered" badge for dinners already joined
      - "Join" button for available dinners
      - "Edit Registration" button for registered dinners
      - After routes assigned: Show group and route
      - "View Route" button when routes are available
    - [x] Route display for participants
      - Group members with contact info
      - Full route timeline
      - Dietary restrictions of guests
      - Google Maps links

### Phase 5: Notifications & Polish

**Goal**: Email notifications and UI refinement

14. **Email Notifications**
    - [ ] Email template for route publication
      - Group members
      - Full route with addresses
      - Times
      - Dietary restrictions
      - After party info
    - [ ] Investigate ChurchTools email API
    - [ ] Send emails when routes published
    - [ ] Registration confirmation email

15. **UI Polish**
    - [ ] Responsive design testing
    - [ ] Loading states
    - [ ] Error handling
    - [ ] Empty states
    - [ ] Confirmation dialogs
    - [ ] Success messages

16. **Documentation**
    - [ ] User guide for organizers
    - [ ] User guide for participants
    - [ ] Algorithm documentation
    - [ ] Deployment guide

## Technical Considerations

### Permissions & Security

- **Decision needed**: How to identify organizers?
  - Option 1: ChurchTools group membership
  - Option 2: Admin permission
  - Option 3: Extension-specific permission
  - **Recommendation**: Check if user has admin permission or is member of specific ChurchTools group
  - **For Now**: ignore this and assume all users can organize

### Email Integration

- Research ChurchTools email API capabilities
- Fallback: Generate email content for organizer to send manually
- Include Google Maps links for addresses

### Edge Cases to Handle

1. **Registration deadline passed**: Disable registration form
2. **Max participants reached**: Auto-waitlist new registrations
3. **User cancels after grouping**: Show warning about organizer notification; organizer must manually adjust groups
4. **User edits after grouping**: Editing disabled; user must contact organizer
5. **Preferred partner doesn't register**: Show warning to organizer, allow manual override
6. **Non-multiple-of-3 participants**: Excess goes to waitlist, organizer handles manually
7. **No solution for routes**: Provide manual assignment interface as fallback
8. **User without ChurchTools account**: Not supported - ChurchTools users only
9. **Registration status control**: Organizer can manually close/reopen registration from Participants tab
10. **Status lifecycle management**:
    - Deleting routes resets status to 'groups-created'
    - Deleting groups resets status to 'registration-closed' and cascades to delete routes

## Open Questions

1. **External participants**: Should we allow non-ChurchTools users to register?
   - If yes: Need external authentication mechanism
   - If no: Organizer must pre-create ChurchTools accounts
     -> answer: For now, only ChurchTools users

2. **Organizer permissions**: How to identify who can create dinners?
   - Admin only?
   - Specific ChurchTools group?
   - Any user (with approval)?
     -> answer: For now, ignore this and assume all users can organize

3. **Email sending**: Direct email API or manual?
   - Investigate ChurchTools email capabilities
   - May need SMTP configuration
     -> answer: For now, dont send emails but just console log

4. **Group size flexibility**: Should algorithm strictly enforce preferredGroupSize?
   - Allow ±1 deviation?
   - Manual override?
     -> answer: Strict enforcement. Excess participants go to waitlist for manual handling.

4.5 **Meal preferences handling**:

- Meal preferences are preferences, not choices
- Algorithm will force meal assignment if needed to balance groups
- Every group must host a meal

5. **Re-grouping**: If participant cancels after grouping, allow re-run?
   - May break existing assignments
   - Need confirmation dialog
     -> answer: yes, allow re-run with warning, if nothing was send to participants yet. if sth was send, manual re-assignment needed.

6. **Map integration**: Just Google Maps links or embedded maps?
   - Embedded maps require API key
   - Links are simpler
     -> answer: for now, just Google Maps links

7. **Deeplinks for invitations**:
   - Not implementing deeplinks initially
   - Future: Use ChurchTools groups feature which has built-in join functionality

## Implementation Scope

**Decision: Full implementation with all features, executed in phases**

- ✅ All features from requirements will be implemented
- ✅ Automated grouping algorithm (with manual override capability)
- ⏸️ Automated routing algorithm - Phase 3 (Next)
- ✅ Waitlist for excess participants (fully implemented with algorithm)
- ✅ Manual group adjustments for edge cases (drag/drop, add/remove members)
- ⏸️ Email notifications (console.log only for now)
- ⏸️ Deeplink invitations (use ChurchTools groups in future)
- ⏸️ Testing & deployment phase (continuous testing approach)

## Current Status Summary

### ✅ Completed (Phases 1, 2, 3 & 4)

**Phase 1 - Foundation:**

- Complete data models with Zod validation
- All 4 Pinia stores (running-dinner, participant, group, route) with full CRUD
- Main App.vue with tab structure (Participate and Organize tabs)
- Toast notifications and confirmation dialogs
- ChurchTools user integration

**Phase 2 - Organizer Experience:**

- OrganizerView with dinner creation/editing/publishing
- DinnerCard component (reusable, with Volt components)
- DinnerForm component (comprehensive form with Zod validation & error display)
- ParticipantList component (DataTable with filters)
- Detail view dialog with tabs (Participants, Groups & Routes)
- Status badge in manage modal header (reactive to status changes)
- Registration control panel:
  - "Close Registration" button (when status is 'published')
  - "Open Registration" button (when status is 'registration-closed')
  - Status indicator with clear messaging
  - Confirmation dialogs for status changes
- GroupBuilder component:
  - Algorithm integration with "Create Groups" button (only enabled when registration is closed)
  - Status dashboard (confirmed, groups, waitlisted counts)
  - Warnings display
  - Info message when registration is still open
  - Manual adjustments (add participant to group, set host, remove member, delete group)
  - Save groups functionality (updates status to 'groups-created')
  - Reset with confirmation (cascades to delete routes, resets status to 'registration-closed')
- GroupCard component:
  - Display group with members, host, assigned meal
  - Host address display
  - Dietary restrictions summary
  - Editable mode with actions

**Phase 3 - Routing Algorithm:**

- ✅ algorithms/routing.ts:
  - Backtracking algorithm for route assignment
  - Ensures no group meets another group more than once
  - Validates meal assignments and group balance
  - Handles constraint satisfaction problem
- ✅ RouteAssignment.vue:
  - "Assign Routes" button with algorithm execution (only enabled when groups are created)
  - Display all assigned routes with timeline view
  - Status tracking (groups, routes assigned)
  - Warning and success messages
  - Save routes functionality (updates status to 'routes-assigned')
  - Reset with confirmation (resets status to 'groups-created')
  - Google Maps links for addresses
- ✅ RouteDisplay.vue:
  - Beautiful timeline view for participants
  - Group member information with contact details
  - Full route with all 3 meals (starter → main → dessert)
  - Host information for each stop
  - Dietary restrictions display
  - Google Maps integration
  - After party information display

**Phase 4 - Participant Experience:**

- ParticipantView (unified view with registration badges and actions)
- Registration restrictions:
  - Join button disabled when status is not 'published'
  - "Registration is closed" message when not in published state
- "View Route" button when routes are available
- ParticipantForm component:
  - Auto-population from ChurchTools user
  - Personal info, address, preferences
  - Preferred partners with email validation
  - Optional meal preferences
  - Dietary restrictions
  - Full Zod validation with error display
- Registration and edit workflows with dialogs:
  - Edit disabled after groups are created
  - Info message: "Editing is no longer available. Please contact the organizer for changes."
- Cancellation workflow:
  - Before groups created: simple cancellation
  - After groups created: enhanced warning about organizer notification and manual adjustments required
  - Success message includes organizer notification note when groups exist
  - TODO comment for future organizer notification implementation
- Route viewing dialog for participants

**Algorithms:**

- ✅ algorithms/grouping.ts:
  - Intelligent group creation respecting preferences
  - Mutual and one-sided partner preference handling
  - Meal assignment with balancing
  - Automatic waitlist management
  - Warning system for edge cases
- ✅ algorithms/routing.ts:
  - Backtracking algorithm for route assignment
  - Constraint satisfaction (no duplicate meetings)
  - Meal order validation (starter → main → dessert)
  - Host address lookup and assignment

### 🔜 Next Steps (Priority Order)

1. ⏸️ **Testing & Validation** - Test routing algorithm with edge cases
2. ⏸️ **Email notifications** - Email content generation (console.log)
3. ⏸️ **Polish & UI refinement** - Edge cases, loading states, error handling

### 📊 Progress

- Phase 1: ✅ 100% Complete (Foundation)
- Phase 2: ✅ 100% Complete (Organizer Experience - Event, Participant, Group & Route Management with Status Controls)
- Phase 3: ✅ 100% Complete (Routing Algorithm & UI with Status-Based Enablement)
- Phase 4: ✅ 100% Complete (Participant Experience - registration with status restrictions, edit/cancel controls based on group status)
- Phase 5: ⏸️ 0% Not Started (Notifications & Polish)

### Status Lifecycle

The application follows a clear status progression with proper controls:

1. **draft** → Organizer creates and configures dinner
2. **published** → Participants can join; organizer can close registration
3. **registration-closed** → No new participants; organizer can create groups or reopen registration
4. **groups-created** → Groups assigned; organizer can assign routes; participants cannot edit registration
5. **routes-assigned** → Routes published; participants can view routes
6. **completed** → Event finished

**Status Reset Behavior:**

- Resetting routes → status reverts to 'groups-created'
- Resetting groups → status reverts to 'registration-closed' AND routes are deleted (cascade)
- Status badge in manage modal is reactive and updates in real-time
