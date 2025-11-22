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
│   │   ├── ParticipantView.vue   # Participant registration & info
│   │   └── PublicView.vue        # Public event list & join
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
  registrationStatus: 'pending' | 'confirmed' | 'waitlist' | 'cancelled';
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
4. After deadline → Create groups
5. Assign meal routes → Publish routes
6. Send email notifications to participants

### 2. Participant View

**Purpose**: Registration and personal dashboard

**Components**:

- "My Registrations" section
- Registration form
- Route display (after routes are assigned)
- Event details

**User Flow**:

1. Browse available published dinners
2. Click "Join" on a dinner
3. Fill registration form (pre-populate from ChurchTools profile)
4. Submit registration
5. Edit registration until deadline
6. After routes published → View group members and route

### 3. Public View (Optional Tab)

**Purpose**: List of published events anyone can browse

**Components**:

- Card list of published dinners
- Filter by date/city
- "Join" buttons (opens registration)
- Single signup visibility (if enabled)

**User Flow**:

1. Browse events
2. See single signups (if publicSingleSignins = true)
3. Join as preferred partner with single signup
4. Click "Join" → Opens registration form

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

### Phase 1: Foundation

**Goal**: Setup data models and basic CRUD operations

1. **Data Types**
   - [ ] Create `src/types/models.ts` with all TypeScript interfaces
   - [ ] Add Zod schemas for validation
   - [ ] Export types for use across app

2. **Pinia Stores**
   - [ ] Extend `runningDinner.ts` store:
     - Full CRUD for dinners
     - Status management methods
     - Publishing workflow
   - [ ] Create `participant.ts` store:
     - CRUD for participants
     - Filter by dinnerId
     - Waitlist management
   - [ ] Create `group.ts` store:
     - CRUD for groups
     - Link to participants
   - [ ] Create `route.ts` store:
     - CRUD for routes
     - Query by dinnerId/groupId

3. **Persistance Setup**
   - [ ] Initialize PersistanceCategory instances for all data types
   - [ ] Test data persistence in development
   - [ ] Implement error handling

4. **ChurchTools Integration**
   - [ ] Fetch current user info
   - [ ] Pre-populate participant form with user data
   - [ ] Determine organizer permissions strategy

### Phase 2: Organizer Experience

**Goal**: Complete organizer workflows

5. **Event Management**
   - [ ] `DinnerForm.vue`: Create/edit dinner form
     - Basic info fields
     - Menu time configuration
     - Validation
   - [ ] `DinnerCard.vue`: Display dinner with status
   - [ ] OrganizerView: Event list and creation workflow
   - [ ] Status transitions (draft → published → closed)

6. **Participant Management**
   - [ ] `ParticipantList.vue`: Display participants
     - Filter by status
     - Show dietary restrictions
     - Waitlist indicator
   - [ ] Show registration count vs. max
   - [ ] Automatic waitlist when max exceeded

7. **Group Builder**
   - [ ] Implement `algorithms/grouping.ts`
   - [ ] `GroupBuilder.vue`: Interface for group creation
     - "Create Groups" button
     - Display algorithm results
     - Show warnings (waitlist participants)
     - Allow manual adjustments:
       - Drag/drop participants between groups
       - Move waitlist participants into groups
       - "Leave nobody behind" - manual inclusion of excess participants
     - Save groups
   - [ ] `GroupCard.vue`: Display group with members

### Phase 3: Routing Algorithm

**Goal**: Implement route assignment

8. **Route Algorithm**
   - [ ] Implement `algorithms/routing.ts`
   - [ ] Write unit tests for edge cases
   - [ ] Performance optimization

9. **Route Assignment UI**
   - [ ] `RouteAssignment.vue`: Interface for route creation
     - "Assign Routes" button
     - Display routes
     - Show conflicts/errors
     - Allow manual override if needed
   - [ ] `RouteDisplay.vue`: Beautiful route card
     - Timeline view
     - Addresses
     - Map links (Google Maps)

10. **Validation & Testing**
    - [ ] Test with various participant counts
    - [ ] Test edge cases (odd numbers, unbalanced preferences)
    - [ ] Ensure algorithm handles all scenarios

### Phase 4: Participant Experience

**Goal**: Complete participant workflows

11. **Registration Flow**
    - [ ] `ParticipantForm.vue`: Registration form
      - Pre-populate from ChurchTools user
      - Preferred partners (email input with validation)
      - Meal preferences
      - Dietary restrictions
    - [ ] Form validation
    - [ ] Edit registration (until deadline)
    - [ ] Cancellation option

12. **Participant Dashboard**
    - [ ] ParticipantView.vue:
      - "My Registrations" section
      - Registration status
      - After routes assigned: Show group and route
    - [ ] Route display for participants
      - Group members with contact info
      - Full route timeline
      - Dietary restrictions of guests
      - Google Maps links

13. **Public Discovery**
    - [ ] PublicView.vue:
      - List published dinners
      - Filter by date/city
      - Show capacity
      - Single signup visibility (if enabled)
    - [ ] Join flow from public view

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
3. **User cancels after grouping**: Re-run algorithm with warning (if routes not sent); otherwise manual reassignment needed
4. **Preferred partner doesn't register**: Show warning to organizer, allow manual override
5. **Non-multiple-of-3 participants**: Excess goes to waitlist, organizer handles manually
6. **No solution for routes**: Provide manual assignment interface as fallback
7. **User without ChurchTools account**: Not supported - ChurchTools users only

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
- ✅ Automated routing algorithm
- ✅ Waitlist for excess participants
- ✅ Manual group adjustments for edge cases
- ⏸️ Email notifications (console.log only for now)
- ⏸️ Deeplink invitations (use ChurchTools groups in future)
- ⏸️ Testing & deployment phase (continuous testing approach)
