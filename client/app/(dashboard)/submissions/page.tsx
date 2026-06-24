import { SubmissionsDashboard } from "@/components/dashboard/submissions-dashboard"
import type {
  ModuleStatus,
  SubmissionModule,
  SubmissionStudent,
  SubmissionStudentRpcRow,
  SubmissionSummary,
} from "@/lib/submissions/types"
import { createClient } from "@/lib/api/server"

function parseModuleStatuses(input: unknown) {
  const result: Record<string, ModuleStatus> = {}

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return result
  }

  for (const [moduleId, status] of Object.entries(input)) {
    if (
      status === "yes" ||
      status === "no" ||
      status === "extension" ||
      status === "not_set"
    ) {
      result[moduleId] = status
    }
  }

  return result
}

export default async function SubmissionsPage() {
  const apiClient = await createClient()

  const [
    { data: modulesData },
    { data: studentsData },
    { data: summaryData },
    { data: groupRows },
  ] = await Promise.all([
    apiClient.rpc<SubmissionModule[]>("list_modules_for_current_user"),
    apiClient.rpc<SubmissionStudentRpcRow[]>(
      "list_student_submissions_paginated_for_current_user",
      {
        p_limit: 20,
        p_offset: 0,
        p_search: null,
        p_group: null,
        p_rag: "all",
      }
    ),
    apiClient.rpc<SubmissionSummary[]>(
      "get_submission_rag_summary_for_current_user",
      {
        p_search: null,
        p_group: null,
        p_rag: "all",
      }
    ),
    apiClient.rpc<Array<{ student_group: string }>>(
      "list_student_groups_for_current_user"
    ),
  ])

  const initialModules = (modulesData ?? []) as SubmissionModule[]
  const studentRows = (studentsData ?? []) as SubmissionStudentRpcRow[]
  const initialStudents: SubmissionStudent[] = studentRows.map((row) => ({
    id: row.id,
    student_id: row.student_id,
    full_name: row.full_name,
    student_group: row.student_group,
    cohort: row.cohort,
    intake: row.intake,
    study_level: row.study_level,
    overall_rag: row.overall_rag,
    module_statuses: parseModuleStatuses(row.module_statuses),
    completed_modules: row.completed_modules,
    total_modules: row.total_modules,
  }))

  const initialSummary = ((summaryData ?? [])[0] as
    | SubmissionSummary
    | undefined) ?? {
    green_count: 0,
    amber_count: 0,
    red_count: 0,
    not_set_count: 0,
    total_students: 0,
    total_modules: 0,
  }

  const initialGroups = (
    (groupRows ?? []) as Array<{ student_group: string }>
  ).map((row) => row.student_group)

  return (
    <SubmissionsDashboard
      initialModules={initialModules}
      initialStudents={initialStudents}
      initialTotalCount={studentRows[0]?.total_count ?? 0}
      initialSummary={initialSummary}
      initialGroups={initialGroups}
    />
  )
}
