import { z } from "zod"

const optionalText = z
  .string()
  .trim()
  .max(120, "Value is too long")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine((value) => !value || z.email().safeParse(value).success, {
    message: "Enter a valid email address",
  })

export const studentInputSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(1, "Student ID is required")
    .max(64, "Student ID is too long"),
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name is too long"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine((value) => !value || /^[+\d()\-\s]{7,20}$/.test(value), {
      message: "Enter a valid phone number",
    }),
  personalEmail: optionalEmail,
  schoolEmail: optionalEmail,
  group: optionalText,
  cohort: optionalText,
  intake: optionalText,
  level: optionalText,
})

export const completeStudentsSchema = z.object({
  studentIds: z
    .array(z.string().trim().min(1))
    .min(1, "Select at least one student"),
})

export type StudentInput = z.infer<typeof studentInputSchema>
export type CompleteStudentsInput = z.infer<typeof completeStudentsSchema>
