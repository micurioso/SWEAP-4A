import { z } from "zod";

export const dependentSchema = z.object({
  slot: z.number().int().min(1).max(4),
  name: z.string().nullable().optional(),
  relationship: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  amount_claimed: z.string().nullable().optional(),
  check_voucher_number: z.string().nullable().optional(),
  claimant_name: z.string().nullable().optional()
});

export const claimantSchema = z.object({
  slot: z.number().int().min(1).max(4),
  name: z.string().nullable().optional(),
  relationship: z.string().nullable().optional()
});

export const memberSchema = z.object({
  employee_number: z.string().min(1, "Employee number is required").regex(/\d/, "Employee number must contain at least one digit"),
  submission_timestamp: z.string().nullable().optional(),
  email_address: z.string().nullable().optional(),
  full_name: z.string().min(1, "Full name is required"),
  permanent_address: z.string().nullable().optional(),
  current_address: z.string().nullable().optional(),
  contact_number: z.string().nullable().optional(),
  birthdate: z.string().nullable().optional(),
  sex: z.string().nullable().optional(),
  civil_status: z.string().nullable().optional(),
  religion: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  ip_affiliation: z.string().nullable().optional(),
  chapter_base: z.string().nullable().optional(),
  division: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  status_of_employment: z.string().nullable().optional(),
  has_physical_inlife_card: z.boolean().nullable().optional(),
  inlife_id_number: z.string().nullable().optional(),
  no_inlife_card_reason: z.string().nullable().optional(),
  claimed_burial_assistance: z.boolean().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_number: z.string().nullable().optional(),
  emergency_contact_relationship: z.string().nullable().optional(),
  consent_signed: z.boolean().nullable().optional(),
  consent_text: z.string().nullable().optional()
});

export const memberWithRelationsSchema = memberSchema.extend({
  dependents: z.array(dependentSchema).max(4),
  claimants: z.array(claimantSchema).max(4)
});

export type Member = z.infer<typeof memberSchema>;
export type Dependent = z.infer<typeof dependentSchema>;
export type Claimant = z.infer<typeof claimantSchema>;
export type MemberWithRelations = z.infer<typeof memberWithRelationsSchema>;

export const newUserSchema = z.object({
  username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/, "Letters, numbers, dot, dash, underscore only"),
  full_name: z.string().min(1),
  role: z.enum(["admin", "viewer"]),
  password: z.string().min(8).optional()
});
