import { StudentRecordsDashboard } from "@/components/dashboard/student-records-dashboard"
import { createClient } from "@/lib/api/server"
import type {
  InterventionStudentOption,
  StudentIntervention,
  StudentInterventionWithTotal,
} from "@/lib/student-records/types"

type StudentRecordsPageProps = {
  searchParams?: Promise<{ student_id?: string }>
}

export default async function StudentRecordsPage({
  searchParams,
}: StudentRecordsPageProps) {
  const apiClient = await createClient()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const studentSearch = resolvedSearchParams?.student_id?.trim() ?? ""
  const {
    data: { user },
  } = await apiClient.auth.getUser()

  const [{ data: interventionsData }, { data: studentsData }] =
    await Promise.all([
      apiClient.rpc<StudentInterventionWithTotal[]>(
        "list_student_interventions_paginated",
        {
          p_limit: 8,
          p_offset: 0,
          p_search: studentSearch || null,
          p_issue_category: "all",
          p_outcome: "all",
        }
      ),
      apiClient.rpc<InterventionStudentOption[]>(
        "search_students_for_intervention",
        {
          p_limit: 40,
          p_search: null,
        }
      ),
    ])

  const rows = (interventionsData ?? []) as StudentInterventionWithTotal[]
  const initialInterventions: StudentIntervention[] = rows.map((row) => ({
    id: row.id,
    student_id: row.student_id,
    student_name: row.student_name,
    interaction_type: row.interaction_type,
    outcome: row.outcome,
    issue_category: row.issue_category,
    notes: row.notes,
    action_item: row.action_item,
    next_planned_contact: row.next_planned_contact,
    logged_by: row.logged_by,
    logged_by_name: row.logged_by_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))

  const initialStudentOptions =
    ((studentsData ?? []) as InterventionStudentOption[]) ?? []

  return (
    <StudentRecordsDashboard
      currentUserId={user?.id ?? null}
      initialInterventions={initialInterventions}
      initialTotalCount={rows[0]?.total_count ?? 0}
      initialStudentOptions={initialStudentOptions}
      initialSearch={studentSearch}
    />
  )
}
