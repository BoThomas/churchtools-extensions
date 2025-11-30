import { z } from 'zod';

// ==================== Common Types ====================

export const MealType = z.enum(['starter', 'mainCourse', 'dessert']);
export type MealType = z.infer<typeof MealType>;

// Meal display options for dropdowns/selects
export const MEAL_OPTIONS: { label: string; value: MealType }[] = [
  { label: '🥗 Starter', value: 'starter' },
  { label: '🍽️ Main Course', value: 'mainCourse' },
  { label: '🍰 Dessert', value: 'dessert' },
];

// Helper to get meal label with emoji
export function getMealLabel(meal: string): string {
  const labels: Record<string, string> = {
    starter: '🥗 Starter',
    mainCourse: '🍽️ Main Course',
    dessert: '🍰 Dessert',
  };
  return labels[meal] || meal;
}

// Helper to get meal severity for badges
export function getMealSeverity(
  meal: string,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  const severities: Record<
    string,
    'success' | 'info' | 'warn' | 'danger' | 'secondary'
  > = {
    starter: 'info',
    mainCourse: 'success',
    dessert: 'warn',
  };
  return severities[meal] || 'secondary';
}

export const EventStatus = z.enum([
  'active', // Event active, no dinner groups yet
  'groups-created', // Meal groups assigned
  'routes-assigned', // Routes created but emails not sent
  'notifications-sent', // Route emails sent to participants
  'completed', // Event finished
]);
export type EventStatus = z.infer<typeof EventStatus>;

// ==================== Event Metadata ====================

export const MenuConfigSchema = z.object({
  starter: z.object({
    startTime: z.string(),
    endTime: z.string(),
  }),
  mainCourse: z.object({
    startTime: z.string(),
    endTime: z.string(),
  }),
  dessert: z.object({
    startTime: z.string(),
    endTime: z.string(),
  }),
});
export type MenuConfig = z.infer<typeof MenuConfigSchema>;

export const AfterPartySchema = z.object({
  time: z.string(),
  location: z.string(),
  description: z.string().optional(),
  isDessertLocation: z.boolean().default(false), // If true, dessert course happens at after party location for all groups
});
export type AfterParty = z.infer<typeof AfterPartySchema>;

/**
 * EventMetadata stores additional metadata not managed by ChurchTools group.
 * This is stored in the extension's KV store and references a ChurchTools group.
 */
export const EventMetadataSchema = z.object({
  id: z.number().optional(), // KV store ID (CategoryValue)
  groupId: z.number(), // ChurchTools child group ID

  // Menu timing
  menu: MenuConfigSchema,

  // Optional after party
  afterParty: AfterPartySchema.optional(),

  // Configuration
  preferredGroupSize: z.number().int().min(2).default(2),
  allowPartnerPreferences: z.boolean().default(false), // Whether participants can specify partner preferences

  // Status tracking (extension workflow, not ChurchTools group state)
  status: EventStatus.default('active'),

  // Metadata
  organizerId: z.number(), // ChurchTools person ID
  createdAt: z.string(), // ISO timestamp
  updatedAt: z.string(), // ISO timestamp
});

export type EventMetadata = z.infer<typeof EventMetadataSchema>;

// ==================== Dinner Group ====================

/**
 * DinnerGroup represents a meal group (2-4 people eating together).
 * Stored in KV store, references ChurchTools person IDs.
 */
export const DinnerGroupSchema = z.object({
  id: z.number().optional(), // KV store ID (CategoryValue)
  eventMetadataId: z.number(), // Reference to EventMetadata
  ctGroupId: z.number(), // ChurchTools group ID
  groupNumber: z.number(), // Human-readable (1, 2, 3...)

  // Members (ChurchTools person IDs)
  memberPersonIds: z.array(z.number()),

  // Meal assignment
  assignedMeal: MealType,
  hostPersonId: z.number().optional(), // Which member hosts this meal

  // Metadata
  createdAt: z.string(), // ISO timestamp
  updatedAt: z.string(), // ISO timestamp
});

export type DinnerGroup = z.infer<typeof DinnerGroupSchema>;

// ==================== Route ====================

export const RouteStopSchema = z.object({
  meal: MealType,
  hostDinnerGroupId: z.number(), // Which dinner group hosts this meal
  // Address will be fetched from ChurchTools person data at runtime
  startTime: z.string(),
  endTime: z.string(),
});
export type RouteStop = z.infer<typeof RouteStopSchema>;

/**
 * Route represents a dinner route for one meal group.
 * Stored in KV store, references DinnerGroup IDs.
 */
export const RouteSchema = z.object({
  id: z.number().optional(), // KV store ID (CategoryValue)
  eventMetadataId: z.number(), // Reference to EventMetadata
  dinnerGroupId: z.number(), // Reference to DinnerGroup

  // Route stops (always 3: starter → main → dessert)
  stops: z.array(RouteStopSchema).length(3),

  // Metadata
  createdAt: z.string(), // ISO timestamp
  updatedAt: z.string(), // ISO timestamp
});

export type Route = z.infer<typeof RouteSchema>;

// ==================== ChurchTools Types ====================

/**
 * ChurchTools Group Member custom fields
 * (these are read from ChurchTools, not stored in our KV)
 */
export interface GroupMemberFields {
  mealPreference?: 'starter' | 'mainCourse' | 'dessert' | 'none';
  dietaryRestrictions?: string;
  allergyInfo?: string;
  partnerPreference?: string; // Comma-separated emails or names
}

/**
 * Simplified ChurchTools Group Member
 * (actual type comes from @churchtools/churchtools-client)
 */
export interface GroupMember {
  personId: number;
  person: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumbers?: { phoneNumber: string }[];
    addresses?: {
      street?: string;
      zip?: string;
      city?: string;
    }[];
  };
  groupMemberStatus: 'active' | 'waiting' | 'inactive';
  groupTypeRoleId?: number;
  groupTypeRole?: {
    id: number;
    name: string;
  };
  fields?: GroupMemberFields;
  memberStartDate?: string;
  waitinglistPosition?: number;
}

/**
 * Raw API response for group member from /groups/{id}/members
 * The person data is nested in domainAttributes
 */
export interface RawGroupMemberResponse {
  id: number;
  personId: number;
  groupMemberStatus:
    | 'active'
    | 'waiting'
    | 'inactive'
    | 'requested'
    | 'to_delete';
  groupTypeRoleId?: number;
  memberStartDate?: string;
  memberEndDate?: string | null;
  waitinglistPosition?: number | null;
  comment?: string | null;
  fields?: GroupMemberFields | [];
  person: {
    title: string;
    domainType: string;
    domainIdentifier: string;
    domainAttributes?: {
      firstName?: string;
      lastName?: string;
      guid?: string;
      isArchived?: boolean;
      dateOfDeath?: string | null;
    };
  };
}

/**
 * Raw person details from /persons/{personId}
 */
export interface RawPersonDetails {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  mobile?: string;
  phonePrivate?: string;
  street?: string;
  zip?: string;
  city?: string;
}

/**
 * Simplified ChurchTools Group
 * (actual type comes from @churchtools/churchtools-client)
 */
export interface Group {
  id: number;
  name: string;
  information?: {
    groupTypeId?: number;
    groupStatusId?: number;
    note?: string;
    meetingTime?: string;
    groupCategoryId?: number | null;
    campusId?: number | null;
    endDate?: string;
    targetGroupId?: number | null; // Parent group ID for child groups
  };
  settings?: {
    isOpenForMembers?: boolean;
    isPublic?: boolean;
    isHidden?: boolean;
    allowWaitinglist?: boolean;
    maxMembers?: number | null;
    inStatistic?: boolean;
    signUpOpeningDate?: string | null;
    signUpClosingDate?: string | null;
  };
}

/**
 * Payload for updating a group via PATCH /groups/{groupId}
 */
export interface GroupUpdatePayload {
  name?: string;
  information?: Partial<Group['information']>;
  settings?: Partial<Group['settings']>;
  // These control registration open/close status
  signUpOpeningDate?: string | null;
  signUpClosingDate?: string | null;
  // Group status (1 = active, 2 = draft/entwurf, 3 = archived)
  groupStatusId?: number;
}

/**
 * Simplified ChurchTools Person
 * (actual type comes from @churchtools/churchtools-client)
 */
export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumbers?: { phoneNumber: string }[];
  addresses?: {
    street?: string;
    zip?: string;
    city?: string;
  }[];
}

// ==================== Service Result Types ====================

export interface GroupingResult {
  dinnerGroups: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[];
  warnings: string[];
  waitlistedPersonIds: number[]; // People excluded from groups
}

export interface RoutingResult {
  routes: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[];
  warnings: string[];
}

export interface EmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}
