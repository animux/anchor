import type { StudentInput } from "@/lib/validations/students"
import type { CompleteStudentsRpcRow } from "@/lib/students/types"

export function toStudentUpsertPayload(input: StudentInput, sstId: string) {
  const nowIso = new Date().toISOString()

  return {
    student_id: input.studentId,
    full_name: input.fullName,
    phone: input.phone ?? null,
    personal_email: input.personalEmail ?? null,
    school_email: input.schoolEmail ?? null,
    student_group: input.group ?? null,
    cohort: input.cohort ?? null,
    intake: input.intake ?? null,
    study_level: input.level ?? null,
    assigned_sst: sstId,
    assignment_started_at: nowIso,
    status: "active" as const,
    completed_at: null,
  }
}

export function summarizeCompleteStudents(rows: CompleteStudentsRpcRow[]) {
  const summary = {
    completed: 0,
    alreadyCompleted: 0,
    notFoundOrForbidden: 0,
    notCompleted: 0,
  }

  for (const row of rows) {
    if (row.outcome === "completed") {
      summary.completed += 1
      continue
    }

    if (row.outcome === "already_completed") {
      summary.alreadyCompleted += 1
      continue
    }

    if (row.outcome === "not_found_or_forbidden") {
      summary.notFoundOrForbidden += 1
      continue
    }

    summary.notCompleted += 1
  }

  return summary
}
