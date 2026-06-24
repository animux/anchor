import { describe, expect, it } from "vitest"

import {
  summarizeCompleteStudents,
  toStudentUpsertPayload,
} from "@/lib/students/operations"

describe("toStudentUpsertPayload", () => {
  it("sets assignment and active status for upsert", () => {
    const payload = toStudentUpsertPayload(
      {
        studentId: "STU-101",
        fullName: "Ari Lane",
        phone: "0722983666",
        schoolEmail: "ari@school.edu",
        personalEmail: "ari@gmail.com",
        group: "Group A",
        cohort: "2026 Autumn",
        intake: "Sept 2026",
        level: "Level 5",
      },
      "0b1f4f63-9e9d-4f90-9d4f-91f08eb164f1"
    )

    expect(payload.student_id).toBe("STU-101")
    expect(payload.phone).toBe("0722983666")
    expect(payload.assigned_sst).toBe("0b1f4f63-9e9d-4f90-9d4f-91f08eb164f1")
    expect(payload.status).toBe("active")
    expect(payload.completed_at).toBeNull()
    expect(payload.assignment_started_at).toBeTruthy()
  })
})

describe("summarizeCompleteStudents", () => {
  it("aggregates rpc outcomes", () => {
    const summary = summarizeCompleteStudents([
      { student_id: "STU-1", outcome: "completed" },
      { student_id: "STU-2", outcome: "completed" },
      { student_id: "STU-3", outcome: "already_completed" },
      { student_id: "STU-4", outcome: "not_found_or_forbidden" },
      { student_id: "STU-5", outcome: "not_completed" },
    ])

    expect(summary).toEqual({
      completed: 2,
      alreadyCompleted: 1,
      notFoundOrForbidden: 1,
      notCompleted: 1,
    })
  })
})
