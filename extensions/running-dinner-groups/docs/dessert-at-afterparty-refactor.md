# Dessert at After Party Location - Refactor Plan

## Current Status & Summary

### Problem Statement

Currently, when `afterParty.isDessertLocation` is enabled:

1. One random dessert group is used as a "placeholder" for the dessert stop in routes
2. This dessert group appears to host at their home, but the location shown is the after party venue
3. Other dessert groups don't have a real meal to prepare - they have no hosting duties
4. This creates confusion about who needs to prepare what, and the routing algorithm treats dessert differently than starter/main

### Proposed Solution

Treat dessert groups **the same as regular meal groups**, but:

1. All dessert groups still prepare dessert at their assigned location
2. The **location** for eating dessert is the after party venue (not the hosts' homes)
3. Dessert groups bring their desserts to the after party location
4. Organizers can choose whether:
   - Groups stay in their small assigned groups at the after party and then mix, OR
   - Everyone just mingles and eats all desserts together (community style)
5. Clear communication to hosts about this setup via email and UI

### Benefits

- **Fairness**: All dessert groups still contribute by making desserts
- **Flexibility**: Organizers decide how to run the dessert portion
- **Simplicity**: Same routing logic (each group visits their assigned dessert group's "location" which happens to be the after party venue)
- **Clear expectations**: Hosts know they're making dessert for the after party

---

## Implementation Plan

### Phase 1: Understand Current Implementation ✅

Files reviewed:

- `src/types/models.ts` - EventMetadata, AfterParty, DinnerGroup, Route schemas
- `src/services/RoutingService.ts` - `assignRoutesWithCentralDessert()` method
- `src/services/EmailService.ts` - Email generation with after party handling
- `src/components/RouteCard.vue` - Route display with after party styling
- `src/components/EventCreator.vue` - After party configuration
- `src/components/DinnerGroupCard.vue` - Dinner group display

### Phase 2: Changes Required

#### 2.1 RoutingService.ts Changes

**Current behavior:**

- `assignRoutesWithCentralDessert()` uses first dessert group as placeholder for ALL routes
- Dessert groups don't have proper routing - they all point to the same placeholder

**New behavior:**

- Keep routing logic **the same as standard routing**
- Each group still gets assigned to a dessert group host (via normal rotation)
- The difference is only in **display/address** - dessert location shows after party venue
- Remove the special `assignRoutesWithCentralDessert()` method or refactor to use standard routing

**Changes:**

1. Modify `assignRoutes()` to always use standard routing
2. The `isDessertLocation` flag affects **display only**, not routing algorithm
3. Keep dessert group assignments functional for dietary/guest counting

#### 2.2 RouteCard.vue Changes

**Current behavior:**

- Seperate entry for dessert stop and after party
- Dessert stop used normal styling with dessert emoji 🍮 at central location
- Additionally there is the after party venue with yellow styling and 🎉 emoji

**New behavior:**

- Dessert stop uses **hybrid styling**:
  - Yellow/amber background (like after party) to indicate special location
  - Dessert emoji 🍮 (not 🎉) to indicate it's still dessert meal
- Show the after party address instead of host's home address
- Add note: "Dessert is served at the after party location"
- Still show host group members and dietary info (they're making the dessert!)
- Keep guest group information (who is eating together)

**Specific changes:**

1. New styling class for "dessert-at-after-party" stops
2. Update address display logic
3. Keep guest/host information visible
4. Ditch the separate after party stop (only one stop for dessert at after party)

#### 2.3 EmailService.ts Changes

**Current behavior:**

- Dessert email block says "All groups meet for dessert at after party"
- Uses after party styling/wording

**New behavior:**

1. **For dessert host groups (preparing dessert):**
   - Clear heading: "🍮 Ihr bereitet zu: Nachspeise (am After Party Ort)"
   - Note: "Bitte bringt eure Nachspeise zum After Party Ort mit"
   - Show guest count and dietary restrictions
   - Show after party address as delivery location

2. **For all groups' route section:**
   - Dessert stop shows: "Nachspeise - [time]"
   - Location: After party address
   - Note: "Nachspeise wird am After Party Ort serviert"
   - Show which dessert group is the host (they're providing the dessert)

3. **Add intro note at top of email (when isDessertLocation):**
   - Brief explanation that dessert course happens at after party venue
   - All dessert hosts bring their desserts there

#### 2.4 DinnerGroupBuilder.vue / DinnerGroupCard.vue Changes

**Current behavior:**

- Dessert groups show normally
- No indication of special after party arrangement

**New behavior:**

1. When `isDessertLocation` is true, add visual indicator on dessert group cards:
   - Badge or icon showing "After Party Dessert"
   - Tooltip explaining they'll bring dessert to after party location
2. Add a note/banner in DinnerGroupBuilder when this mode is active

#### 2.5 RouteAssignment.vue Changes

**Current behavior:**

- Shows warning about dessert at after party

**New behavior:**

- Update warning text to explain new behavior:
  - "Dessert will be served at the after party location. Dessert groups will prepare and bring their desserts there."

---

## Questions & Decisions

### Q1: Routing Algorithm

**Current:** Uses special `assignRoutesWithCentralDessert()` that doesn't properly route dessert.
**Proposed:** Use standard routing - everyone still gets assigned to a dessert host group.

**Question:** Should we keep the routing simple (standard 3-stop routing) and only change the address display, or is there a benefit to the current approach?

✅ **Decision:** Use standard routing and ditch the placeholder approach. This keeps guest counts accurate and the algorithm simpler.

### Q2: Dessert Group Hosting Indicator

When `isDessertLocation` is true, should we:

- A) Still show "Host" badge on dessert groups (they're hosting = making dessert)
- B) Show a different badge like "Prepares Dessert" or "Dessert Provider"
- C) Remove host indicator since they're not hosting at home

✅ **Decision:** Option B - show "Prepares Dessert" badge to make it clear they're making dessert but not hosting at home.

### Q3: Route Card Timeline Styling

For the dessert stop when `isDessertLocation` is true:

- A) Yellow background (after party) + dessert emoji 🍮
- B) Pink background (regular dessert) + after party indicator
- C) New unique color (e.g., orange) for "shared dessert"

✅ **Decision:** Option A - yellow background with dessert emoji. Distinctive and indicates shared location while keeping meal type clear.

### Q4: Guest Count Display

With everyone at the after party for dessert:

- Current: Shows guests for the assigned dessert host group
- Should we show: "All participants" as guest count?

✅ **Decision:** Keep current behavior - show assigned guest groups only. Even at the after party, groups might eat together initially before mixing.

### Q5: Email Personalization

For dessert hosts, should the email emphasize:

- A) "You're making dessert for your assigned groups (X, Y people)" with dietary restrictions
- B) "You're making dessert for everyone at the after party (total Z people)"
- C) "You're making dessert. The organizer will coordinate portions."

✅ **Decision:** Option A - show assigned groups count and dietary restrictions. Hosts make dessert at home, then bring it to the after party location. They're responsible for the dietary needs of their assigned guests, even if the organizer decides to let everyone share. This ensures dietary restrictions are properly handled.

---

## Files to Modify

- [x] **`src/services/RoutingService.ts`** ✅
  - Remove `assignRoutesWithCentralDessert()` method
  - Use standard routing (`assignRoutesStandard()`) for all cases
  - `isDessertLocation` becomes display-only flag (no routing impact)

- [x] **`src/components/RouteCard.vue`** ✅
  - Add hybrid styling for dessert-at-after-party stops (yellow bg + 🍮)
  - Update address logic to use after party venue for dessert when `isDessertLocation`
  - Add explanatory note about dessert location
  - Remove separate after party stop when dessert is at after party (merge into one)
  - Keep guest/host info visible for dietary purposes

- [x] **`src/services/EmailService.ts`** ✅
  - Update dessert host section: "Ihr bereitet zu: Nachspeise (am After Party Ort)"
  - Add note: "Bitte bereitet die Nachspeise zu Hause vor und bringt sie zum After Party Ort mit"
  - Show guest count and dietary restrictions for assigned groups
  - Update route stop messaging for dessert (shows "Nachspeise von: [group]" and "Nachspeise wird am After Party Ort serviert")
  - After party section only shown when dessert is NOT at after party (to avoid duplication)

- [x] **`src/components/DinnerGroupCard.vue`** ✅
  - When `isDessertLocation` is true, show "@ After Party" badge with tooltip
  - Added info banner explaining they prepare at home and bring to after party
  - Changed host icon from 🏠 to ⭐ for dessert groups (with "Prepares dessert for this group" tooltip)
  - Hide host address section for dessert groups at after party

- [x] **`src/components/DinnerGroupBuilder.vue`** ✅
  - Add info banner when `isDessertLocation` is active
  - Explain that dessert groups prepare at home and bring desserts to after party

- [x] **`src/components/RouteAssignment.vue`** ✅
  - Warning message comes from RoutingService: "Dessert will be served at the after party location. Dessert groups will prepare their desserts at home and bring them there."

---

## Implementation Checklist

- [x] 1. **RoutingService refactor** - Remove special central dessert logic, use standard routing
- [x] 2. **RouteCard UI** - Hybrid styling, merged dessert/after-party display
- [x] 3. **DinnerGroupCard UI** - "@ After Party" badge, info banner, updated host icon
- [x] 4. **DinnerGroupBuilder UI** - Info banner for dessert-at-after-party mode
- [x] 5. **RouteAssignment UI** - Updated warning text (via RoutingService)
- [x] 6. **EmailService** - Updated messaging for dessert hosts and route info
