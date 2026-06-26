export const moduleStatuses = ["yes", "no", "extension", "not_set"] as const

export type ModuleStatus = (typeof moduleStatuses)[number]

export type RagStatus = "green" | "amber" | "red" | "not_set"

export type SubmissionModule = {
  module_id: number
  module_name: string
  created_at: string
}

export type SubmissionStudentRpcRow = {
  id: number
  student_id: string
  full_name: string | null
  student_group: string | null
  cohort: string | null
  intake: string | null
  study_level: string | null
  overall_rag: RagStatus
  module_statuses: Record<string, ModuleStatus>
  completed_modules: number
  rated_modules: number
  total_modules: number
  total_count: number
}

export type SubmissionStudent = Omit<SubmissionStudentRpcRow, "total_count">

export type SubmissionSummary = {
  green_count: number
  amber_count: number
  red_count: number
  not_set_count: number
  total_students: number
  total_modules: number
}
