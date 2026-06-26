export const interactionTypes = [
  "Call - Connected",
  "Call - Voicemail",
  "Call - No Answer",
  "Call - External List",
  "Email - Bulk",
  "Email - Sent",
  "Email - Reply to Student",
  "In-person",
] as const

export const interventionOutcomes = ["Successful", "Attempted"] as const

export const issueCategories = [
  "Health",
  "Admin",
  "Family",
  "Job",
  "Finance",
  "Academic",
  "Housing",
  "Visa/Immigration",
  "Other",
] as const

export type InteractionType = (typeof interactionTypes)[number]
export type InterventionOutcome = (typeof interventionOutcomes)[number]
export type IssueCategory = (typeof issueCategories)[number]

export type InterventionStudentOption = {
  student_id: string
  full_name: string | null
  assigned_sst: string | null
  status: "active" | "completed"
}

export type StudentIntervention = {
  id: string
  student_id: string
  student_name: string | null
  interaction_type: InteractionType
  outcome: InterventionOutcome
  issue_category: IssueCategory
  notes: string
  action_item: string
  next_planned_contact: string | null
  logged_by: string | null
  logged_by_name: string
  created_at: string
  updated_at: string
}

export type StudentInterventionWithTotal = StudentIntervention & {
  total_count: number
}
