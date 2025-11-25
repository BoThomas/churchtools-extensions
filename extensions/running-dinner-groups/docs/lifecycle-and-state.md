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

**Questions:**

- Does `automaticMoveUp` trigger any notifications? If not, we might need to use Routines for that.
- When someone moves from waitlist to active, does CT send an email?

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

```typescript
// API: GET /groups/{groupId}/places (deprecated but functional)
{
  id: number;
  name: string | null;
  street: string | null;
  city: string | null;
  geoLat: string | null;
  geoLng: string | null;
  // ... address fields
}
```

**This is perfect for the after-party location!**

**Suggested Usage:**

- Use a Group Place for the central after-party venue
- This stores address info directly on the CT group
- Members can see it in their group view

**Questions:**

- The API is marked `deprecated` - is there a replacement?
- Can we use the Address API instead (`/addresses/{domainType}/{domainIdentifier}`)?

### 7. Routines for Automation

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

// Available actions include:
// - 'send-member-email': Send email to member
// - 'create-follow-up': Create a follow-up task
// - 'add-member-to-group': Add member to another group
// - 'change-member-status': Change membership status
// - 'archive-member': Archive membership
// - 'special:wait': Wait for a period
// - 'special:repeat': Repeat the routine
```

**This is powerful for our workflow automations!**

**Suggested Routines:**

1. **Waitlist Promotion Notification:**
   - Trigger: Member status changes from `waiting` to `active`
   - Action: `send-member-email` with welcome message + instructions

2. **Late Withdrawal Warning:**
   - Trigger: Member status changes to `to_delete` after registration closes
   - Action: `send-member-email` to organizers alerting them

3. **Post-Event Follow-up:**
   - Trigger: Could be manual or timed
   - Action: `create-follow-up` for feedback collection

**Questions:**

- Can we create routines programmatically via API, or only via CT UI?
- What triggers are available? The types mention `group_membership` domain with status transitions.
- Can we trigger routines based on dates (e.g., 1 day before event)?

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
- **Registration open/closed** → `isOpenForMembers` + dates
- **Waitlist management** → `allowWaitinglist`, `automaticMoveUp`
- **After-party location** → Group Places or Addresses
- **Event info/wiki link** → `information.note` (description)
- **Announcements** → Posts
- **Member notifications** → Routines (if API supports creation)

### 🔶 Hybrid (CT + KV):

- **Event metadata** → Some in CT group settings, some in KV (e.g., our custom workflow status)
- **Meal times** → Could use GroupMeetings for display, but KV for routing logic

### ❌ Keep in KV Store:

- **Dinner groups** → Complex meal group assignments don't fit CT data model
- **Routes** → Location assignments per course need our own structure
- **Workflow status** → `'groups-created' | 'routes-assigned' | 'notifications-sent'` is extension-specific

---

## Open Questions for Design Decision

1. **Routine Creation:** Can we create/update Routines via API, or do organizers need to set them up manually in CT? If manual, should we provide a setup guide?

2. **Group Places Deprecation:** The `/groups/{groupId}/places` endpoint is deprecated. What's the recommended replacement? Should we use the generic `/addresses` API?

3. **Minimum CT Version:** Which ChurchTools version introduced these features? We should document minimum requirements.

4. **Error States:** What happens if a CT API call fails mid-workflow (e.g., we created the group but failed to set settings)? Do we need rollback logic?

5. **Permissions:** What CT permissions does an organizer need? Can we check these upfront and show a clear error?

6. **GroupMeetings for Routes?** Could we creatively use GroupMeetings where each "meeting" represents a stop on the route? The times would be the meal times, and we'd store the host/location in comments. But this feels like a stretch.

7. **Status Transitions:** Should we enforce status transitions in order (e.g., can't go from `pending` directly to `archived`)? Or allow any transition?

8. **Historical Data:** When archiving old events, should we also clean up KV store data, or keep it for statistics/history?
