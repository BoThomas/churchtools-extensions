# Running Dinner: Lifecycle and State

I want to better integrate the CT group features into the lifecycle of the Running Dinner extension.

First, there is the organization/parent group — this is good right now.
Then there are the subgroups that represent an event.

We don’t utilize the CT group lifecycle at the moment. We should do better.
Groups can be in:

- Entwurf
- Aktiv
- Beendet
- Archiviert

After that, they can be deleted.

They can also have visibility:

- Öffentlich
- Intern
- Eingeschränkt
- Versteckt

"Anmeldung" can be:

- geschlossen
- geöffnet

We can also plan an automatic start date for opening or closing the Anmeldung.

So I think we could find a solid lifecycle for Running Dinners that utilizes these features without us needing to implement our own concept and keep track of it in our extension’s KV store. We should just control the group settings and thereby control the event state.

Maybe we can find even more CT features, making it completely unnecessary to store our own KV data. For example:

- We could create a wiki entry from the organization view describing how Running Dinner works.
- We could use "Beschreibung" to link to the wiki entry and provide other sensible information about the event.
- We could use "Beiträge" to notify members about things everyone is allowed to know, like posting pictures after the event is finished.
- We can use "Treffen" to specify meal times.
- We can use "Treffpunkt" for the optional after-event.
- We could better utilize roles (remove the ones we don’t need, but use, e.g., "Organisator" for people helping out with the event).
- We could use the "Routinen" feature to define automations for waitlists or people leaving the event in different states (e.g., sending emails if someone joins from the waitlist, or when someone leaves the event after dinner-group/route planning is done).

Maybe we can even find a way to save dinner groups and routes using CT group features — e.g., using subgroups for dinner groups and "Treffen" for routes/meal times. But this might be a stretch. Lets stick to kv-store persistance for now for these features.

---

## Analysis & Suggestions (from API/Type Research)

### 1. Group Status (`groupStatusId`) - CT Native Lifecycle

Based on the API types, ChurchTools groups have a `groupStatusId` that maps to:

```typescript
export type GroupStatus = {
  id: number;
  name: 'active' | 'pending' | 'archived' | 'finished';
  nameTranslated: string; // "Entwurf" | "Aktiv" | "Beendet" | "Archiviert"
  sortKey: number;
};
```

**Suggested Lifecycle Mapping:**
| Running Dinner Phase | CT Status | German | Description |
|---------------------|-----------|--------|-------------|
| Planning/Setup | `pending` | Entwurf | Event is being set up, not yet visible |
| Registration Open | `active` | Aktiv | Participants can join |
| Groups/Routes Done | `active` | Aktiv | Still active, but with `isOpenForMembers: false` |
| Event Completed | `finished` | Beendet | Event took place, data preserved |
| Long-term Archive | `archived` | Archiviert | Old events, reduced visibility |

**Questions:**

- Do we want to use `pending` for the initial setup phase? This would prevent participants from seeing the event until it's "published."
- Should we transition to `finished` automatically after the event date passes?
- Is there a meaningful difference between `finished` and `archived` for our use case? `archived` seems more permanent.

### 2. Visibility Settings (`settings.visibility`)

The Group type has:

```typescript
visibility: GroupVisibility; // 'hidden' | 'intern' | 'restricted' | 'public'
```

**Suggested Visibility Mapping:**
| Running Dinner Phase | Visibility | Description |
|---------------------|------------|-------------|
| Initial Setup | `hidden` | Only organizers can see |
| Registration Open (church members only) | `intern` | Church members can see & join |
| Registration Open (anyone) | `public` | Public registration via GroupHomepage |
| After Event | `intern` or `hidden` | Keep visible for members, or hide |

**Questions:**

- Do we always want Running Dinner events to be church-member-only (`intern`), or should we support `public` for community events?
- What does `restricted` mean exactly? Could be useful for invite-only events.

### 3. Registration Control (`isOpenForMembers` + Dates)

The Group settings include:

```typescript
isOpenForMembers: boolean;
signUpOpeningDate: ZuluDateNullable;
signUpClosingDate: ZuluDateNullable;
```

**This is exactly what we need for automatic registration windows!**

**Suggested Usage:**

- When creating an event, set `signUpOpeningDate` and `signUpClosingDate`
- CT will automatically open/close registration at those times
- We can still manually toggle `isOpenForMembers` if needed
- Consider showing a countdown in the UI: "Registration opens in 3 days"

**Questions:**

- Do these dates work with timezones correctly?
- What happens if `isOpenForMembers: false` but we're within the date range? Does the date override?
- Should we validate that closing date is before event date?

### 4. Waitlist Features

The Group settings include:

```typescript
allowWaitinglist: boolean;
automaticMoveUp: boolean;
waitinglistMaxPersons: number | null;
```

Also available in `signupConditions`:

```typescript
groupAllowsWaitinglist: boolean;
groupHasSpaceOnWaitinglist: boolean;
```

**This is native waitlist management!**

**Suggested Usage:**

- Enable `allowWaitinglist: true` by default
- Set `automaticMoveUp: true` so waitlisted people auto-join when spots open
- Use `waitinglistMaxPersons` if we want to limit how long the waitlist can get

**✅ RESOLVED:** `automaticMoveUp` does NOT trigger notifications. We need to create a Routine with trigger `waiting` → `active` to notify people when promoted.

**Form Fields Needed:**

- Enable waitlist? (checkbox)
- Waitlist limit? (number input, optional - null = unlimited)
- Auto move-up? (checkbox, default: true)

### 5. Group Meetings (Treffen) for Meal Times

```typescript
export type GroupMeeting = {
  id: number;
  groupId: number;
  startDate: ZuluDate;
  endDate: ZuluDate;
  comment?: string | null;
  isCanceled?: boolean;
  isCompleted?: boolean;
  attendances?: {
    [personId: string]: 'present' | 'absent' | 'unsure' | 'not-in-group';
  };
  pollResult?: Array<MeetingTemplateField> | null;
};
```

**This could represent meal courses!**

**Suggested Usage:**

- Create 3 GroupMeetings per event: Starter, Main Course, Dessert
- Use `startDate`/`endDate` for the time windows
- Use `comment` to store meal type or location info
- Use `attendances` to track who attended (post-event)

**Potential Issues:**

- GroupMeetings seem designed for group-wide gatherings, not subgroup activities
- Would need 3 meetings where everyone has the same times, but they're at different locations...
- **Verdict: Probably not a good fit for our rotating structure. Stick with KV store for routes.**

### 6. Group Places (Treffpunkt) for After-Event Location

~~The API `/groups/{groupId}/places` is deprecated.~~

**✅ RESOLVED:** Use the Addresses API instead:

```
GET/POST /api/addresses/group/{groupId}
```

**Suggested Usage:**

- Use Addresses API for the central after-party venue
- This stores address info directly on the CT group
- Members can see it in their group view

### 7. Routines for Automation - ✅ FULLY API-CONTROLLABLE!

**See "Resolved Questions" section below for complete API documentation.**

```typescript
export type Routine = {
  id: number;
  name: string;
  description: string | null;
  domainType: 'group_membership';
  isEnabled: boolean;
  priority: number;
  steps: Array<RoutineStep>;
};
```

**API Workflow:**

1. `POST /api/routines` - Create routine with domainContext (groupId, roleId, status)
2. `POST /api/routines/{id}/steps/validate` - Validate step before adding
3. `PATCH /api/routines/{id}` - Add steps and/or enable
4. `GET /api/routines/{id}/runs` - Check execution history

**Available Actions:**

- `send-member-email` - Send automated email with placeholders
- `create-follow-up` - Create follow-up task
- `add-member-to-group` - Add to another group
- `edit-group-membership` - Edit role/fields
- `change-member-status-*` - Change status
- `remove-member` - Remove from group
- `invite-member` - Invite to ChurchTools
- `archive-member` - Archive person

**Suggested Routines for Running Dinner:**

1. **Waitlist Promotion Notification:**
   - Trigger: Member status changes from `waiting` to `active`
   - Action: `send-member-email` with welcome message + instructions

2. **Late Withdrawal Warning:**
   - Trigger: Member status changes to `to_delete` after registration closes
   - Action: `send-member-email` to organizers alerting them

3. **Post-Event Follow-up:**
   - Trigger: Could be manual or timed
   - Action: `create-follow-up` for feedback collection

### 8. Posts (Beiträge) for Communication

```typescript
export type Post = {
  id: number;
  guid: string;
  title: string;
  content: string | null;
  visibility: 'group_visible' | 'group_intern';
  publishedDate?: ZuluDate;
  expirationDate?: ZuluDateNullable;
  commentsActive: boolean;
  group: DomainObjectGroup;
  // ...
};
```

**Great for event announcements and recaps!**

**Suggested Usage:**

- Post pre-event instructions to all participants
- Post photos and thanks after the event
- Use `visibility: 'group_intern'` for member-only posts
- Use `publishedDate` for scheduled announcements

### 9. Description/Info for Wiki Link

The Group type has:

```typescript
information: {
  note: string; // This is the "Beschreibung"
  // ...
}
```

**Suggested Usage:**

- Add a standard info text linking to Wiki documentation
- Include essential dates and contact info
- Could be templated during event creation

### 10. Signup Conditions (Read-Only Info)

The Group type includes `signupConditions`:

```typescript
signupConditions?: {
  canSignUp: boolean;
  canSignUpAsNewPerson: boolean;
  groupIsActive: boolean;
  groupIsNotFull: boolean;
  groupIsOpenForMembers: boolean;
  groupHasSpaceOnWaitinglist: boolean;
  // ... many more conditions
};
```

**This is great for UI feedback!**

**Suggested Usage:**

- Show organizers exactly why people can/can't sign up
- Display "Event is full" vs "Registration closed" vs "Event hidden"
- Use for debugging registration issues

---

## Summary: What We Can Defer to CT vs Keep in KV Store

### ✅ CT Native (No KV needed):

- **Event lifecycle status** → `groupStatusId` (pending → active → finished → archived)
- **Visibility** → `settings.visibility` (hidden → intern → public)
- **Registration open/closed** → `isOpenForMembers` + dates (**requires Leiter!**)
- **Waitlist management** → `allowWaitinglist`, `automaticMoveUp`, `waitinglistMaxPersons`
- **After-party location** → `/api/addresses/group/{groupId}`
- **Event info/wiki link** → `information.note` (description)
- **Announcements** → Posts
- **Member notifications** → **Routines (fully API-controllable!)**
- **Partner relationships** → Co-registration via `allowSpouseRegistration`, `allowOtherRegistration`
- **Who registered whom** → `groupMember.registeredBy` relationship

### 🔶 Hybrid (CT + KV):

- **Event metadata** → Some in CT group settings, some in KV (e.g., our custom workflow status)
- **Meal times** → Could use GroupMeetings for display, but KV for routing logic

### ❌ Keep in KV Store:

- **Dinner groups** → Complex meal group assignments don't fit CT data model
- **Routes** → Location assignments per course need our own structure
- **Workflow status** → `'groups-created' | 'routes-assigned' | 'notifications-sent'` is extension-specific

---

## Resolved Questions & Confirmed API Capabilities

### ✅ 1. Routine Creation via API - CONFIRMED WORKING!

Based on reverse-engineering the CT UI, **Routines can be fully created and managed via API**:

```typescript
// 1. Create a routine for a specific group/role/status combination
POST /api/routines
{
  "domainType": "group_membership",
  "name": "Routinen für Teilnehmer",
  "domainContext": {
    "groupId": 54,
    "groupTypeRoleId": 22,        // Role ID (e.g., Teilnehmer)
    "groupMemberStatus": "active"  // Trigger status
  }
}
// Response: { "data": { "id": 25, "isEnabled": false, "steps": [] } }

// 2. Validate a step before adding
POST /api/routines/{routineId}/steps/validate
{
  "actionData": {
    "senderId": 0,
    "subject": "test",
    "body": "<p>hallo {{{person.firstName}}}</p>",
    "addSignOutUrl": true
  },
  "actionKey": "send-member-email",
  "isEnabled": true
}
// Response: 204 No Content (valid)

// 3. Add steps to the routine
PATCH /api/routines/{routineId}
{
  "steps": [{
    "actionData": {
      "senderId": 0,
      "subject": "Willkommen beim Running Dinner!",
      "body": "<p>Hallo {{{person.firstName}}}, du bist dabei!</p>",
      "addSignOutUrl": true
    },
    "actionKey": "send-member-email",
    "isEnabled": true
  }]
}

// 4. Enable the routine
PATCH /api/routines/{routineId}
{ "isEnabled": true }

// 5. Check routine runs
GET /api/routines/{routineId}/runs?with_potential_domain_objects=true&include[]=domainObject
```

**Available Placeholders** (from `/api/placeholders/email` and `/api/placeholders/group/{groupId}`):

- Person: `{{{person.firstName}}}`, `{{{person.lastName}}}`, `{{{person.email}}}`, etc.
- Group: `{{{group.name}}}`, `{{{group.meetingday}}}`, `{{{group.meetingtime}}}`, `{{{group.meetingplace}}}`
- Membership: `{{{groupMember.role}}}`, `{{{groupMember.status}}}`, `{{{groupMember.startDate}}}`, `{{{groupMember.waitinglistPosition}}}`
- **Custom Group Fields**: `{{{groupMemberField.mealpreference}}}`, `{{{groupMemberField.dietaryrestrictions}}}`, etc.

**Available Actions** (from `POST /api/actions`):

- `send-member-email` - Send automated email
- `create-follow-up` - Create follow-up task
- `add-member-to-group` - Add to another group
- `edit-group-membership` - Edit role/fields
- `change-member-status-*` - Change status (active→requested, active→to_delete, etc.)
- `remove-member` - Remove from group
- `invite-member` - Invite to ChurchTools
- `archive-member` - Archive person

**Suggested Routines for Running Dinner:**

1. **Waitlist → Active Notification** (trigger: `waiting` → `active`)
2. **Welcome Email** (trigger: new `active` member)
3. **Late Cancellation Alert** (trigger: `active` → `to_delete` after registration closed)

### ✅ 2. Addresses API - Replacement for Deprecated Places

The correct API for group addresses is:

```
GET/POST /api/addresses/group/{groupId}
```

This replaces the deprecated `/groups/{groupId}/places` endpoint.

### ✅ 3. Registration Dates - Requires Group Leader

The `signUpOpeningDate` and `signUpClosingDate` features work, but **the group must have a "Leiter" (leader) assigned for people to be able to join**.

**Action Required:** When creating an event group, we MUST:

1. Prompt organizer to select a Leiter for the event group
2. Or auto-assign the creating user as Leiter

### ✅ 4. Waitlist & Auto Move-Up - No Automatic Notifications

Confirmed settings:

- `allowWaitinglist: boolean` - Enable waitlist when group is full
- `automaticMoveUp: boolean` - Auto-promote from waitlist when spots open
- `waitinglistMaxPersons: number | null` - Limit waitlist size (null = unlimited)

**Important:** `automaticMoveUp` does NOT send notifications automatically. We need to create a **Routine** with trigger `waiting` → `active` to notify people when they move up.

**Form Fields Needed:**

- [ ] Enable waitlist? (checkbox)
- [ ] Waitlist limit? (number, optional)
- [ ] Auto move-up? (checkbox, default: true)

### ✅ 5. Permissions - Organizers Are Admins (For Now)

Deferred. For MVP, assume organizers have admin-level CT permissions.

---

## New Requirements Discovered

### Co-Registration Settings ("Anmeldung weiterer Personen")

CT supports multiple co-registration modes that we should utilize:

```typescript
settings: {
  allowOtherRegistration: boolean; // Can register other people
  allowSameEmailRegistration: boolean; // People with same email
  allowSpouseRegistration: boolean; // Spouse (via CT relationships)
  allowChildRegistration: boolean; // Children under 16 (via CT relationships)
}
```

**Recommended Approach for Partner Preferences:**

1. Enable `allowSpouseRegistration: true` - CT handles spouse relationships
2. Enable `allowOtherRegistration: true` if we want "preferred partner" feature
3. When someone registers another person, CT tracks this via `groupMember.registeredBy`
4. We can query this relationship later when building dinner groups!

**Placeholders available:**

- `{{{groupMember.registeredBy}}}` - Name of person who registered them
- `{{{groupMember.registeredBy-firstName}}}`, `{{{groupMember.registeredBy-email}}}`, etc.

**This could replace our custom `partnerPreference` field!**

- Instead of a text field where people type a name
- Use CT's "register spouse" or "register other person" feature
- Query `registeredBy` relationship when grouping
- People registered together = prefer to be in same dinner group

### Leader Requirement for Event Groups

**Critical Discovery:** Child/event groups MUST have a "Leiter" assigned, otherwise no one can join the group.

**Options:**

1. Auto-assign the creating organizer as Leiter
2. Prompt for Leiter selection in event creation form
3. Use a shared "Running Dinner Orga" account as Leiter for all events

### Kids Feature - Deferred

The `allowChildRegistration` feature exists, but handling children at a Running Dinner adds complexity:

- Do children count toward group size?
- Do they need their own meal preferences?
- How does this affect routing?

**Decision:** Leave out child registration for MVP. Can revisit later.

---

## Updated Summary: CT Native vs KV Store

### ✅ CT Native (No KV needed):

- **Event lifecycle status** → `groupStatusId`
- **Visibility** → `settings.visibility`
- **Registration open/closed** → `isOpenForMembers` + dates
- **Waitlist management** → `allowWaitinglist`, `automaticMoveUp`, `waitinglistMaxPersons`
- **After-party location** → `/api/addresses/group/{groupId}`
- **Event info/wiki link** → `information.note`
- **Announcements** → Posts
- **Member notifications** → **Routines (fully API-controllable!)**
- **Partner relationships** → Co-registration (`registeredBy` tracking)
- **Email templates** → `/api/htmltemplates?domain_type=email`

### ❌ Keep in KV Store:

- **Dinner groups** → Complex meal group assignments
- **Routes** → Location assignments per course
- **Workflow status** → Extension-specific states

---

## Remaining Open Questions

1. **Error States:** What happens if a CT API call fails mid-workflow? Do we need rollback logic?

2. **Status Transitions:** Should we enforce status transitions in order?

3. **Historical Data:** When archiving old events, should we also clean up KV store data?

4. **Routine Cleanup:** When deleting an event group, should we also delete associated routines?

5. **Partner Preference Implementation:**
   - Option A: Use CT's `registeredBy` relationship (simpler, CT-native)
   - Option B: Keep custom `partnerPreference` text field (more flexible, but more work)
   - **Recommendation:** Start with Option A, add Option B later if needed

6. **Event Creation Form Fields:**
   - Event name
   - Event date
   - Max participants
   - Leiter selection (required!)
   - Registration open/close dates (optional)
   - Waitlist enabled? + Max waitlist size?
   - Allow spouse co-registration?
   - Allow other person co-registration? (for partner preferences)
   - After-party location?
