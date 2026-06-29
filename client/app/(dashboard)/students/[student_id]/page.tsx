import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeftIcon,
  BookOpenCheckIcon,
  CalendarClockIcon,
  MailIcon,
  PhoneIcon,
  UserCircle2Icon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/api/server"
import { getRagLabel } from "@/lib/submissions/operations"
import type {
  SubmissionModule,
  SubmissionStudentRpcRow,
} from "@/lib/submissions/types"
import type {
  StudentIntervention,
  StudentInterventionWithTotal,
} from "@/lib/student-records/types"
import type { StudentRecordWithTotal } from "@/lib/students/types"

type StudentProfilePageProps = {
  params: Promise<{ student_id: string }>
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "Not set"
  }

  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getInitials(name: string | null, studentId: string) {
  const text = (name ?? "").trim()
  if (!text) {
    return studentId.slice(0, 2).toUpperCase()
  }

  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function getRagClass(rag: SubmissionStudentRpcRow["overall_rag"] | null) {
  if (rag === "green") {
    return "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-100"
  }

  if (rag === "amber") {
    return "bg-amber-500/20 text-amber-800 dark:bg-amber-300/25 dark:text-amber-100"
  }

  if (rag === "red") {
    return "bg-red-500/15 text-red-800 dark:bg-red-400/20 dark:text-red-100"
  }

  return "bg-muted text-muted-foreground"
}

function getModuleStatusClass(status: string) {
  if (status === "yes") {
    return "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-400/16 dark:text-emerald-100"
  }

  if (status === "no") {
    return "border-red-500/35 bg-red-500/10 text-red-800 dark:border-red-400/35 dark:bg-red-400/16 dark:text-red-100"
  }

  if (status === "extension") {
    return "border-amber-500/35 bg-amber-500/12 text-amber-800 dark:border-amber-300/35 dark:bg-amber-300/16 dark:text-amber-100"
  }

  return "border-border/70 bg-muted/30 text-muted-foreground"
}

function getStatusClass(status: StudentRecordWithTotal["status"]) {
  return status === "completed"
    ? "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-100"
    : "bg-blue-500/15 text-blue-800 dark:bg-blue-400/20 dark:text-blue-100"
}

export default async function StudentProfilePage({
  params,
}: StudentProfilePageProps) {
  const { student_id } = await params
  const studentId = decodeURIComponent(student_id).trim()

  if (!studentId) {
    notFound()
  }

  const apiClient = await createClient()

  const [
    { data: studentData },
    { data: submissionsData },
    { data: modulesData },
    { data: interventionsData },
  ] = await Promise.all([
    apiClient.rpc("list_students_paginated_for_current_user", {
      p_limit: 100,
      p_offset: 0,
      p_search: studentId,
      p_status: "all",
      p_group: null,
    }),
    apiClient.rpc<SubmissionStudentRpcRow[]>(
      "list_student_submissions_paginated_for_current_user",
      {
        p_limit: 100,
        p_offset: 0,
        p_search: studentId,
        p_group: null,
        p_rag: "all",
      }
    ),
    apiClient.rpc<SubmissionModule[]>("list_modules_for_current_user"),
    apiClient.rpc<StudentInterventionWithTotal[]>(
      "list_student_interventions_paginated",
      {
        p_limit: 100,
        p_offset: 0,
        p_search: studentId,
        p_issue_category: "all",
        p_outcome: "all",
      }
    ),
  ])

  const studentRows = (studentData ?? []) as StudentRecordWithTotal[]
  const student = studentRows.find(
    (row) => row.student_id.toLowerCase() === studentId.toLowerCase()
  )

  if (!student) {
    notFound()
  }

  const submissionRows = (submissionsData ?? []) as SubmissionStudentRpcRow[]
  const submission =
    submissionRows.find(
      (row) => row.student_id.toLowerCase() === studentId.toLowerCase()
    ) ?? null

  const modules = (modulesData ?? []) as SubmissionModule[]
  const interventions = (
    (interventionsData ?? []) as StudentInterventionWithTotal[]
  )
    .filter((row) => row.student_id.toLowerCase() === studentId.toLowerCase())
    .map((row) => ({
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
    })) as StudentIntervention[]

  const nextPlannedContact =
    interventions.find((row) => Boolean(row.next_planned_contact))
      ?.next_planned_contact ?? null

  const outstandingModules = submission
    ? Math.max(0, submission.rated_modules - submission.completed_modules)
    : 0

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-6">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-background via-background to-primary/8 p-6 shadow-[0_20px_70px_-42px_var(--primary)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-8 right-6 size-32 rounded-full bg-primary/20 blur-3xl"
        />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
          <Button
            asChild
            variant="outline"
            className="rounded-xl border-border/70 bg-background/80"
          >
            <Link href="/all-students">
              <ArrowLeftIcon className="size-4" />
              Back to roster
            </Link>
          </Button>

          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-border/70 bg-background/80"
            >
              <Link
                href={`/submissions?student_id=${encodeURIComponent(student.student_id)}`}
              >
                Submissions
              </Link>
            </Button>
            <Button
              asChild
              className="rounded-xl shadow-[0_14px_30px_-20px_var(--primary)]"
            >
              <Link
                href={`/student-records?student_id=${encodeURIComponent(student.student_id)}`}
              >
                Log intervention
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap items-start gap-4">
          <div className="grid size-14 place-items-center rounded-full border border-border/70 bg-background/80 text-lg font-semibold text-foreground">
            {getInitials(student.full_name, student.student_id)}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {student.full_name ?? student.student_id}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {student.student_id}
              {student.student_group ? ` · ${student.student_group}` : ""}
              {student.cohort ? ` · ${student.cohort}` : ""}
              {student.intake ? ` · ${student.intake}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className={getStatusClass(student.status)}>
                {student.status}
              </Badge>
              <Badge className={getRagClass(submission?.overall_rag ?? null)}>
                {submission
                  ? getRagLabel(submission.overall_rag)
                  : "RAG not set"}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 lg:grid-cols-4">
        <article className="rounded-2xl border border-border/70 bg-background p-4">
          <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
            Submission progress
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {submission
              ? `${submission.completed_modules}/${submission.rated_modules}`
              : "-"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Completed/rated modules
          </p>
        </article>

        <article className="rounded-2xl border border-border/70 bg-background p-4">
          <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
            Outstanding
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {submission ? outstandingModules : "-"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Modules needing completion
          </p>
        </article>

        <article className="rounded-2xl border border-border/70 bg-background p-4">
          <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
            Interventions
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {interventions.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Logged records found
          </p>
        </article>

        <article className="rounded-2xl border border-border/70 bg-background p-4">
          <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
            Next contact
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatDate(nextPlannedContact)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Latest planned follow-up
          </p>
        </article>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <article className="rounded-3xl border border-border/70 bg-background p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Student details
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-muted/25 p-3">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Level
              </p>
              <p className="mt-1 font-medium text-foreground">
                {student.study_level ?? "Not set"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/25 p-3">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Status updated
              </p>
              <p className="mt-1 font-medium text-foreground">
                {formatDate(student.updated_at)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/25 p-3">
              <p className="inline-flex items-center gap-1 text-xs tracking-widest text-muted-foreground uppercase">
                <MailIcon className="size-3.5" />
                School email
              </p>
              <p className="mt-1 font-medium break-all text-foreground">
                {student.school_email ?? "Not set"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/25 p-3">
              <p className="inline-flex items-center gap-1 text-xs tracking-widest text-muted-foreground uppercase">
                <UserCircle2Icon className="size-3.5" />
                Personal email
              </p>
              <p className="mt-1 font-medium break-all text-foreground">
                {student.personal_email ?? "Not set"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/25 p-3 sm:col-span-2">
              <p className="inline-flex items-center gap-1 text-xs tracking-widest text-muted-foreground uppercase">
                <PhoneIcon className="size-3.5" />
                Phone
              </p>
              <p className="mt-1 font-medium text-foreground">
                {student.phone ?? "Not set"}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-border/70 bg-background p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Module status
          </h2>
          {submission && modules.length > 0 ? (
            <div className="mt-4 space-y-2">
              {modules.map((module) => {
                const status =
                  submission.module_statuses[String(module.module_id)] ??
                  "not_set"

                return (
                  <div
                    key={module.module_id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/25 px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {module.module_name}
                    </p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getModuleStatusClass(status)}`}
                    >
                      {status === "not_set" ? "Not set" : status}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-border/70 px-3 py-5 text-sm text-muted-foreground">
              No module submission data found for this student.
            </p>
          )}
        </article>
      </section>

      <section className="mt-5 rounded-3xl border border-border/70 bg-background p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            Intervention history
          </h2>
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClockIcon className="size-3.5" />
            Recent records first
          </p>
        </div>

        {interventions.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border/70 px-3 py-6 text-sm text-muted-foreground">
            No interventions logged yet for this student.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {interventions.map((record) => (
              <li
                key={record.id}
                className="rounded-2xl border border-border/70 bg-muted/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                      <BookOpenCheckIcon className="size-4" />
                      {record.interaction_type}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(record.created_at)} · {record.issue_category}{" "}
                      · {record.outcome}
                    </p>
                  </div>
                  <Badge variant="outline">{record.logged_by_name}</Badge>
                </div>

                <p className="mt-3 text-sm text-foreground/90">
                  {record.notes}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Action: {record.action_item}
                  {record.next_planned_contact
                    ? ` · Next contact ${formatDate(record.next_planned_contact)}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
