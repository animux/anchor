import { getProfileRole } from "@/lib/api/get-profile-role"
import { createClient } from "@/lib/api/server"
import { StudentsDashboard } from "@/components/dashboard/students-dashboard"
import type {
  StudentRecord,
  StudentRecordWithTotal,
} from "@/lib/students/types"

export default async function AllStudentsPage() {
  const apiClient = await createClient()
  const {
    data: { user },
  } = await apiClient.auth.getUser()

  const role = await getProfileRole(apiClient, user?.user_metadata?.role)
  const currentUserId = user?.id ?? null

  const { data } = await apiClient.rpc(
    "list_students_paginated_for_current_user",
    {
      p_limit: 20,
      p_offset: 0,
      p_search: null,
      p_status: "all",
      p_group: null,
    }
  )

  const rows = (data ?? []) as StudentRecordWithTotal[]
  const initialStudents: StudentRecord[] = rows.map((row) => ({
    id: row.id,
    student_id: row.student_id,
    full_name: row.full_name,
    phone: row.phone,
    personal_email: row.personal_email,
    school_email: row.school_email,
    student_group: row.student_group,
    cohort: row.cohort,
    intake: row.intake,
    study_level: row.study_level,
    assigned_sst: row.assigned_sst,
    assignment_started_at: row.assignment_started_at,
    previous_assigned_sst: row.previous_assigned_sst,
    status: row.status,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
  const initialTotalCount = rows[0]?.total_count ?? 0

  const { data: groupRows } = await apiClient.rpc(
    "list_student_groups_for_current_user"
  )
  const initialGroups = (
    (groupRows ?? []) as Array<{ student_group: string }>
  ).map((row) => row.student_group)

  return (
    <StudentsDashboard
      role={role}
      currentUserId={currentUserId}
      initialStudents={initialStudents}
      initialTotalCount={initialTotalCount}
      initialGroups={initialGroups}
    />
  )
}
