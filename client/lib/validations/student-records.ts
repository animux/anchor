import { z } from "zod"

import {
  interactionTypes,
  interventionOutcomes,
  issueCategories,
} from "@/lib/student-records/types"

export const createInterventionSchema = z.object({
  studentId: z.string().trim().min(1, "Student is required"),
  interactionType: z.enum(interactionTypes, {
    error: "Interaction type is required",
  }),
  outcome: z.enum(interventionOutcomes, {
    error: "Outcome is required",
  }),
  issueCategory: z.enum(issueCategories, {
    error: "Issue category is required",
  }),
  notes: z
    .string()
    .trim()
    .min(5, "Outcome / notes must be at least 5 characters")
    .max(2000, "Outcome / notes is too long"),
  actionItem: z
    .string()
    .trim()
    .min(5, "Action item must be at least 5 characters")
    .max(1000, "Action item is too long"),
  nextPlannedContact: z
    .string()
    .trim()
    .min(1, "Next planned contact date is required")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Enter a valid date",
    }),
})

export type CreateInterventionInput = z.infer<typeof createInterventionSchema>
