import { z } from 'zod';

// ==================== Running Dinner ====================

export const MealType = z.enum(['starter', 'mainCourse', 'dessert']);
export type MealType = z.infer<typeof MealType>;

export const DinnerStatus = z.enum([
  'draft',
  'published',
  'registration-closed',
  'groups-created',
  'routes-assigned',
  'completed',
]);
export type DinnerStatus = z.infer<typeof DinnerStatus>;

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

export const AfterPartySchema = z.object({
  time: z.string(),
  location: z.string(),
});

export const RunningDinnerSchema = z.object({
  id: z.number().optional(), // Category value ID
  name: z.string().min(1, 'Name is required'),
  description: z.string().default(''),
  date: z.string().min(1, 'Event date is required'), // ISO date
  city: z.string().min(1, 'City is required'),
  maxParticipants: z.number().int().min(6, 'At least 6 participants needed'),
  allowPreferredPartners: z.boolean().default(true),
  publicSingleSignins: z.boolean().default(false),
  preferredGroupSize: z.number().int().min(2).default(2),
  allowPreferredMeal: z.boolean().default(true),
  registrationDeadline: z.string().min(1, 'Registration deadline is required'), // ISO date

  // Menu configuration
  menu: MenuConfigSchema,

  // Optional after party
  afterParty: AfterPartySchema.optional(),

  // Additional info
  participantInfo: z.string().optional(),

  // Status tracking
  status: DinnerStatus.default('draft'),

  // Metadata
  organizerId: z.number(), // ChurchTools person ID
  createdAt: z.string(), // ISO timestamp
  updatedAt: z.string(), // ISO timestamp
  publishedAt: z.string().optional(), // ISO timestamp
});

export type RunningDinner = z.infer<typeof RunningDinnerSchema>;
export type MenuConfig = z.infer<typeof MenuConfigSchema>;
export type AfterParty = z.infer<typeof AfterPartySchema>;

// ==================== Participant ====================

// Registration status:
// - 'confirmed': Participant is registered and confirmed (default for new registrations)
// - 'waitlist': Participant exceeded max capacity and is on waitlist
// - 'cancelled': Participant cancelled their registration
export const RegistrationStatus = z.enum([
  'confirmed',
  'waitlist',
  'cancelled',
]);
export type RegistrationStatus = z.infer<typeof RegistrationStatus>;

export const AddressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  zip: z.string().min(1, 'ZIP is required'),
  city: z.string().min(1, 'City is required'),
});
export type Address = z.infer<typeof AddressSchema>;

export const ParticipantSchema = z.object({
  id: z.number().optional(), // Category value ID
  dinnerId: z.number(), // Reference to RunningDinner

  // Personal info
  personId: z.number().optional(), // ChurchTools person ID (if logged in)
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone is required'),

  // Address
  address: AddressSchema,

  // Preferences
  preferredPartners: z.array(z.string().email()).default([]),
  preferredMeal: MealType.optional(),
  dietaryRestrictions: z.string().default(''),

  // Status
  registrationStatus: RegistrationStatus.default('confirmed'),
  groupId: z.number().optional(), // Assigned group (set after grouping)

  // Metadata
  registeredAt: z.string(), // ISO timestamp
  updatedAt: z.string(), // ISO timestamp
});

export type Participant = z.infer<typeof ParticipantSchema>;

// ==================== Group ====================

export const GroupSchema = z.object({
  id: z.number().optional(), // Category value ID
  dinnerId: z.number(), // Reference to RunningDinner
  groupNumber: z.number(), // Human-readable group number (1, 2, 3...)

  // Members
  participantIds: z.array(z.number()),

  // Meal assignments
  assignedMeal: MealType.optional(),
  hostParticipantId: z.number().optional(), // Which participant hosts this meal

  // Metadata
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Group = z.infer<typeof GroupSchema>;

// ==================== Route ====================

export const RouteStopSchema = z.object({
  meal: MealType,
  hostGroupId: z.number(), // Which group is hosting this meal
  hostAddress: AddressSchema,
  startTime: z.string(),
  endTime: z.string(),
});
export type RouteStop = z.infer<typeof RouteStopSchema>;

export const RouteSchema = z.object({
  id: z.number().optional(), // Category value ID
  dinnerId: z.number(), // Reference to RunningDinner
  groupId: z.number(), // Reference to Group

  // Route stops (in order)
  stops: z.array(RouteStopSchema).length(3), // Always 3 stops

  // Metadata
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Route = z.infer<typeof RouteSchema>;

// ==================== Helper Functions ====================

export function normalizeDate(date: string | Date): string {
  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }
  return date.toISOString();
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
