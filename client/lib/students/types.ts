export type StudentRecord = {
  id: number
  student_id: string
  full_name: string | null
  phone: string | null
  personal_email: string | null
  school_email: string | null
  student_group: string | null
  cohort: string | null
  intake: string | null
  study_level: string | null
  assigned_sst: string | null
  assignment_started_at: string | null
  previous_assigned_sst: Array<{
    sst_id: string
    start_date: string | null
    end_date: string | null
  }> | null
  status: "active" | "completed"
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type CompleteStudentsRpcRow = {
  student_id: string
  outcome:
    | "completed"
    | "already_completed"
    | "not_found_or_forbidden"
    | "not_completed"
}

export type StudentRecordWithTotal = StudentRecord & {
  total_count: number
}
