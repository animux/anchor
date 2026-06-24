"use client"

import { useCallback, useMemo, useState } from "react"
import {
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
  UserCheckIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { getAuthRoleLabel, type AuthRole } from "@/lib/auth/roles"
import { createClient } from "@/lib/api/client"
import {
  parseStudentsExcelRows,
  type ParsedExcelResult,
} from "@/lib/students/excel"
import {
  summarizeCompleteStudents,
  toStudentUpsertPayload,
} from "@/lib/students/operations"
import type {
  CompleteStudentsRpcRow,
  StudentRecord,
  StudentRecordWithTotal,
} from "@/lib/students/types"
import {
  studentInputSchema,
  type StudentInput,
} from "@/lib/validations/students"

type StudentsDashboardProps = {
  role: AuthRole
  currentUserId: string | null
  initialStudents: StudentRecord[]
  initialTotalCount: number
  initialGroups: string[]
}

type StudentsQueryFilters = {
  search: string
  status: "all" | "active" | "completed"
  group: string
}

const STUDENTS_PAGE_SIZE = 20

type StudentFormState = {
  studentId: string
  fullName: string
  phone: string
  personalEmail: string
  schoolEmail: string
  group: string
  cohort: string
  intake: string
  level: string
}

const emptyStudentForm: StudentFormState = {
  studentId: "",
  fullName: "",
  phone: "",
  personalEmail: "",
  schoolEmail: "",
  group: "",
  cohort: "",
  intake: "",
  level: "",
}

export function StudentsDashboard({
  role,
  currentUserId,
  initialStudents,
  initialTotalCount,
  initialGroups,
}: StudentsDashboardProps) {
  const roleLabel = getAuthRoleLabel(role)
  const apiClient = useMemo(() => createClient(), [])

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<StudentsQueryFilters["status"]>("all")
  const [groupFilter, setGroupFilter] = useState("")
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents)
  const [availableGroups, setAvailableGroups] =
    useState<string[]>(initialGroups)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState("1")
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set()
  )

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [studentForm, setStudentForm] =
    useState<StudentFormState>(emptyStudentForm)
  const [isSavingStudent, setIsSavingStudent] = useState(false)

  const [isImportOpen, setIsImportOpen] = useState(false)
  const [parsedImport, setParsedImport] = useState<ParsedExcelResult | null>(
    null
  )
  const [isParsingImport, setIsParsingImport] = useState(false)
  const [isImportingRows, setIsImportingRows] = useState(false)

  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [pendingCompleteIds, setPendingCompleteIds] = useState<string[]>([])
  const [isCompleting, setIsCompleting] = useState(false)

  const fetchStudents = useCallback(
    async (page: number, filters: StudentsQueryFilters) => {
      setIsLoadingStudents(true)

      const offset = (page - 1) * STUDENTS_PAGE_SIZE
      const { data, error } = await apiClient.rpc(
        "list_students_paginated_for_current_user",
        {
          p_limit: STUDENTS_PAGE_SIZE,
          p_offset: offset,
          p_search: filters.search.trim() || null,
          p_status: filters.status,
          p_group: filters.group.trim() || null,
        }
      )

      if (error) {
        toast.error(error.message)
        setStudents([])
        setTotalCount(0)
        setIsLoadingStudents(false)
        return
      }

      const rows = (data ?? []) as StudentRecordWithTotal[]
      setStudents(
        rows.map((row) => ({
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
      )
      setTotalCount(rows[0]?.total_count ?? 0)
      setIsLoadingStudents(false)
    },
    [apiClient]
  )

  const fetchAvailableGroups = useCallback(async () => {
    const { data, error } = await apiClient.rpc(
      "list_student_groups_for_current_user"
    )

    if (error) {
      const isMissingGroupsRpc = error.message
        .toLowerCase()
        .includes(
          "could not find the function public.list_student_groups_for_current_user"
        )

      if (!isMissingGroupsRpc) {
        toast.error(error.message)
        return
      }

      // Compatibility fallback for environments where the groups RPC
      // has not been applied yet.
      const { data: fallbackRows, error: fallbackError } = await apiClient.rpc(
        "list_students_paginated_for_current_user",
        {
          p_limit: 100,
          p_offset: 0,
          p_search: null,
          p_status: "all",
          p_group: null,
        }
      )

      if (fallbackError) {
        toast.error(fallbackError.message)
        return
      }

      const fallbackGroups = Array.from(
        new Set(
          ((fallbackRows ?? []) as StudentRecordWithTotal[])
            .map((row) => row.student_group)
            .filter((group): group is string => Boolean(group?.trim()))
            .map((group) => group.trim())
        )
      ).sort((a, b) => a.localeCompare(b))

      setAvailableGroups(fallbackGroups)
      toast.warning(
        "Student groups endpoint is unavailable in this environment; using fallback group list."
      )
      return
    }

    const groups = ((data ?? []) as Array<{ student_group: string }>).map(
      (row) => row.student_group
    )
    setAvailableGroups(groups)
  }, [apiClient])

  const activeFilters = useMemo<StudentsQueryFilters>(
    () => ({ search: query, status: statusFilter, group: groupFilter }),
    [query, statusFilter, groupFilter]
  )

  const visibleStudentIds = useMemo(
    () => students.map((student) => student.student_id),
    [students]
  )

  const allVisibleSelected =
    visibleStudentIds.length > 0 &&
    visibleStudentIds.every((studentId) => selectedStudentIds.has(studentId))

  function updateStudentFormField<K extends keyof StudentFormState>(
    key: K,
    value: StudentFormState[K]
  ) {
    setStudentForm((current) => ({ ...current, [key]: value }))
  }

  function toggleSelectAllVisible() {
    setSelectedStudentIds((current) => {
      const next = new Set(current)

      if (allVisibleSelected) {
        for (const studentId of visibleStudentIds) {
          next.delete(studentId)
        }
      } else {
        for (const studentId of visibleStudentIds) {
          next.add(studentId)
        }
      }

      return next
    })
  }

  function toggleStudentSelection(studentId: string) {
    setSelectedStudentIds((current) => {
      const next = new Set(current)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  async function upsertStudent(input: StudentInput) {
    if (!currentUserId) {
      toast.error("You must be signed in to create or import students")
      return false
    }

    const payload = toStudentUpsertPayload(input, currentUserId)
    const { error } = await apiClient.rpc("upsert_student_for_current_user", {
      p_student_id: payload.student_id,
      p_full_name: payload.full_name,
      p_phone: payload.phone,
      p_personal_email: payload.personal_email,
      p_school_email: payload.school_email,
      p_student_group: payload.student_group,
      p_cohort: payload.cohort,
      p_intake: payload.intake,
      p_study_level: payload.study_level,
    })

    if (error) {
      if (error.code === "23505" || error.message.includes("duplicate")) {
        toast.error("Duplicate student_id detected")
      } else if (
        error.message.toLowerCase().includes("row-level security") ||
        error.message.toLowerCase().includes("violates row-level security")
      ) {
        toast.error(
          "Permission denied. Verify your account role allows this action."
        )
      } else if (error.code === "406") {
        toast.error(
          "API schema access failed. Check server configuration and retry."
        )
      } else {
        toast.error(error.message)
      }
      return false
    }

    return true
  }

  async function handleCreateStudentSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const parsed = studentInputSchema.safeParse(studentForm)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid student input")
      return
    }

    setIsSavingStudent(true)
    const success = await upsertStudent(parsed.data)
    setIsSavingStudent(false)

    if (!success) return

    toast.success("Student saved and assigned to your caseload")
    setStudentForm(emptyStudentForm)
    setIsCreateOpen(false)
    await fetchStudents(currentPage, activeFilters)
    await fetchAvailableGroups()
  }

  async function handleImportFileChange(file: File | null) {
    if (!file) {
      setParsedImport(null)
      return
    }

    setIsParsingImport(true)

    try {
      const parsed = await parseStudentsExcelRows(file)
      setParsedImport(parsed)
      if (parsed.errors.length > 0) {
        toast.warning(
          `Parsed with ${parsed.errors.length} invalid row${parsed.errors.length === 1 ? "" : "s"}`
        )
      } else {
        toast.success(`Ready to import ${parsed.validRows.length} rows`)
      }
    } catch {
      setParsedImport(null)
      toast.error("Unable to parse Excel file")
    } finally {
      setIsParsingImport(false)
    }
  }

  async function handleImportRows() {
    if (!parsedImport) {
      toast.error("Upload and parse an Excel file first")
      return
    }

    if (parsedImport.validRows.length === 0) {
      toast.error("No valid rows to import")
      return
    }

    setIsImportingRows(true)
    let successCount = 0
    const importFailures: Array<{ rowNumber: number; message: string }> = []

    for (const row of parsedImport.validRows) {
      const success = await upsertStudent(row.data)
      if (success) {
        successCount += 1
      } else {
        importFailures.push({
          rowNumber: row.rowNumber,
          message: "Database insert/update failed",
        })
      }
    }

    setIsImportingRows(false)
    setCurrentPage(1)
    await fetchStudents(1, activeFilters)

    const parserErrorCount = parsedImport.errors.length
    const failureCount = importFailures.length

    if (failureCount === 0 && parserErrorCount === 0) {
      toast.success(`Imported ${successCount} students successfully`)
      setParsedImport(null)
      setIsImportOpen(false)
      await fetchAvailableGroups()
      return
    }

    toast.warning(
      `Import finished with issues: ${successCount} success, ${parserErrorCount} invalid row${parserErrorCount === 1 ? "" : "s"}, ${failureCount} failure${failureCount === 1 ? "" : "s"}`
    )
    await fetchAvailableGroups()
  }

  function openCompleteDialog(studentIds: string[]) {
    if (studentIds.length === 0) {
      toast.error("Select at least one student to complete")
      return
    }

    setPendingCompleteIds(studentIds)
    setIsCompleteDialogOpen(true)
  }

  async function completePendingStudents() {
    setIsCompleting(true)

    const { data, error } = await apiClient.rpc("complete_students", {
      p_student_ids: pendingCompleteIds,
    })

    setIsCompleting(false)

    if (error) {
      toast.error(error.message)
      return
    }

    const rows = (data ?? []) as CompleteStudentsRpcRow[]
    const summary = summarizeCompleteStudents(rows)

    if (summary.completed > 0) {
      toast.success(
        `Completed ${summary.completed} student${summary.completed === 1 ? "" : "s"}`
      )
    }

    if (
      summary.alreadyCompleted > 0 ||
      summary.notFoundOrForbidden > 0 ||
      summary.notCompleted > 0
    ) {
      toast.warning(
        `Some rows were skipped: already completed ${summary.alreadyCompleted}, not found/forbidden ${summary.notFoundOrForbidden}, not completed ${summary.notCompleted}`
      )
    }

    setSelectedStudentIds((current) => {
      const next = new Set(current)
      for (const studentId of pendingCompleteIds) {
        next.delete(studentId)
      }
      return next
    })

    setPendingCompleteIds([])
    setIsCompleteDialogOpen(false)
    await fetchStudents(currentPage, activeFilters)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / STUDENTS_PAGE_SIZE))

  async function goToPage(page: number) {
    const safePage = Math.min(Math.max(page, 1), totalPages)
    setCurrentPage(safePage)
    setPageInput(String(safePage))
    setSelectedStudentIds(new Set())
    await fetchStudents(safePage, {
      search: query,
      status: statusFilter,
      group: groupFilter,
    })
  }

  async function handlePageJump() {
    const parsed = Number(pageInput)
    if (!Number.isInteger(parsed) || parsed < 1) {
      toast.error("Enter a valid page number")
      setPageInput(String(currentPage))
      return
    }

    await goToPage(parsed)
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 bg-linear-to-r from-background via-background to-muted/30 px-4 py-4 sm:px-7 sm:py-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {role === "admin" ? "All students" : "Your students"}
            </h1>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.18em] text-primary uppercase">
              {roleLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {students.length} records on this page · {totalCount} total · page{" "}
            {currentPage} of {totalPages} ·{" "}
            {role === "admin"
              ? "imported from institutional spreadsheet"
              : "limited to your active caseload"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="h-10 gap-2 px-4 text-sm sm:h-11 sm:px-5"
            onClick={() => setIsCreateOpen(true)}
            disabled={!currentUserId}
          >
            <PlusIcon className="size-4" />
            Create New Student
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 gap-2 px-4 text-sm sm:h-11 sm:px-5"
            onClick={() => setIsImportOpen(true)}
            disabled={!currentUserId}
          >
            <ArrowUpIcon className="size-4" />
            Import from Excel
          </Button>
        </div>
      </header>

      <div className="px-4 py-5 sm:px-7 sm:py-6">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                const nextSearch = event.target.value
                setQuery(nextSearch)
                setCurrentPage(1)
                setPageInput("1")
                setSelectedStudentIds(new Set())
                void fetchStudents(1, {
                  search: nextSearch,
                  status: statusFilter,
                  group: groupFilter,
                })
              }}
              placeholder="Search by ID, name, group, cohort"
              className="h-11 rounded-2xl border-border/70 bg-muted/25 pl-11 text-base"
            />
          </div>
          <select
            value={groupFilter}
            onChange={(event) => {
              const nextGroup = event.target.value
              setGroupFilter(nextGroup)
              setCurrentPage(1)
              setPageInput("1")
              setSelectedStudentIds(new Set())
              void fetchStudents(1, {
                search: query,
                status: statusFilter,
                group: nextGroup,
              })
            }}
            className="h-11 rounded-2xl border border-border/70 bg-muted/25 px-3 text-sm"
          >
            <option value="">All groups</option>
            {availableGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => {
              const nextStatus = event.target
                .value as StudentsQueryFilters["status"]
              setStatusFilter(nextStatus)
              setCurrentPage(1)
              setPageInput("1")
              setSelectedStudentIds(new Set())
              void fetchStudents(1, {
                search: query,
                status: nextStatus,
                group: groupFilter,
              })
            }}
            className="h-11 rounded-2xl border border-border/70 bg-muted/25 px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <div className="h-11" />
        </div>

        {selectedStudentIds.size > 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="text-sm text-foreground">
              {selectedStudentIds.size} selected for bulk actions
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedStudentIds(new Set())}
              >
                <XIcon className="size-4" />
                Clear Selection
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  openCompleteDialog(Array.from(selectedStudentIds))
                }
              >
                <UserCheckIcon className="size-4" />
                Complete Selected
              </Button>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/35 hover:bg-muted/35">
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible students"
                  />
                </TableHead>
                <TableHead className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  ID
                </TableHead>
                <TableHead className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Student
                </TableHead>
                <TableHead className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Emails
                </TableHead>
                <TableHead className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Phone
                </TableHead>
                <TableHead className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Group
                </TableHead>
                <TableHead className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Cohort
                </TableHead>
                <TableHead className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Intake
                </TableHead>
                <TableHead className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Level
                </TableHead>
                <TableHead className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Status
                </TableHead>
                <TableHead className="text-right text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingStudents ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2Icon className="size-4 animate-spin" />
                      Loading students...
                    </span>
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No students found for that search.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.has(student.student_id)}
                        onChange={() =>
                          toggleStudentSelection(student.student_id)
                        }
                        aria-label={`Select ${student.student_id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.student_id}
                    </TableCell>
                    <TableCell>{student.full_name ?? "-"}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs leading-relaxed">
                        <div>{student.school_email ?? "-"}</div>
                        <div className="text-muted-foreground">
                          {student.personal_email ?? "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{student.phone ?? "-"}</TableCell>
                    <TableCell>{student.student_group ?? "-"}</TableCell>
                    <TableCell>{student.cohort ?? "-"}</TableCell>
                    <TableCell>{student.intake ?? "-"}</TableCell>
                    <TableCell>{student.study_level ?? "-"}</TableCell>
                    <TableCell>
                      <span
                        className={
                          student.status === "completed"
                            ? "rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-300"
                            : "rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-700 dark:text-amber-300"
                        }
                      >
                        {student.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={student.status === "completed"}
                        onClick={() => openCompleteDialog([student.student_id])}
                      >
                        <CheckIcon className="size-4" />
                        Complete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * STUDENTS_PAGE_SIZE + 1}
            {" - "}
            {Math.min(currentPage * STUDENTS_PAGE_SIZE, totalCount)} of{" "}
            {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={currentPage <= 1 || isLoadingStudents}
              onClick={() => void goToPage(currentPage - 1)}
            >
              <ChevronLeftIcon className="size-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage}
            </span>
            <Input
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handlePageJump()
                }
              }}
              className="h-9 w-24"
              placeholder="Page"
            />
            <Button
              type="button"
              variant="outline"
              disabled={isLoadingStudents}
              onClick={() => void handlePageJump()}
            >
              Go
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={currentPage >= totalPages || isLoadingStudents}
              onClick={() => void goToPage(currentPage + 1)}
            >
              Next
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Create New Student</SheetTitle>
            <SheetDescription>
              Add a student manually. Existing student IDs will be reassigned to
              your current SST caseload.
            </SheetDescription>
          </SheetHeader>

          <form
            className="grid gap-3 px-6"
            onSubmit={handleCreateStudentSubmit}
          >
            <Input
              placeholder="Student ID"
              value={studentForm.studentId}
              onChange={(event) =>
                updateStudentFormField("studentId", event.target.value)
              }
            />
            <Input
              placeholder="Full name"
              value={studentForm.fullName}
              onChange={(event) =>
                updateStudentFormField("fullName", event.target.value)
              }
            />
            <Input
              placeholder="Phone"
              value={studentForm.phone}
              onChange={(event) =>
                updateStudentFormField("phone", event.target.value)
              }
            />
            <Input
              placeholder="School email"
              value={studentForm.schoolEmail}
              onChange={(event) =>
                updateStudentFormField("schoolEmail", event.target.value)
              }
            />
            <Input
              placeholder="Personal email"
              value={studentForm.personalEmail}
              onChange={(event) =>
                updateStudentFormField("personalEmail", event.target.value)
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Group"
                value={studentForm.group}
                onChange={(event) =>
                  updateStudentFormField("group", event.target.value)
                }
              />
              <Input
                placeholder="Cohort"
                value={studentForm.cohort}
                onChange={(event) =>
                  updateStudentFormField("cohort", event.target.value)
                }
              />
              <Input
                placeholder="Intake"
                value={studentForm.intake}
                onChange={(event) =>
                  updateStudentFormField("intake", event.target.value)
                }
              />
              <Input
                placeholder="Level"
                value={studentForm.level}
                onChange={(event) =>
                  updateStudentFormField("level", event.target.value)
                }
              />
            </div>

            <SheetFooter className="px-0">
              <Button type="submit" disabled={isSavingStudent}>
                {isSavingStudent ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <PlusIcon className="size-4" />
                )}
                Save Student
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={isImportOpen} onOpenChange={setIsImportOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Import from Excel</SheetTitle>
            <SheetDescription>
              The first worksheet is parsed row by row. Invalid rows are skipped
              and reported. Supported headers include Student ID, Name, Phone,
              Personal email, School email, Group, Intake, Level, and Cohort.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-6">
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4">
              <label className="text-sm font-medium">Excel file</label>
              <input
                className="mt-2 block w-full text-sm"
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  void handleImportFileChange(file)
                }}
              />
              {isParsingImport ? (
                <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2Icon className="size-3 animate-spin" />
                  Parsing workbook...
                </p>
              ) : null}
            </div>

            {parsedImport ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 p-3 text-sm">
                    <div className="text-muted-foreground">Total Rows</div>
                    <div className="text-lg font-semibold">
                      {parsedImport.totalRows}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
                    <div className="text-muted-foreground">Valid</div>
                    <div className="text-lg font-semibold">
                      {parsedImport.validRows.length}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm">
                    <div className="text-muted-foreground">Invalid</div>
                    <div className="text-lg font-semibold">
                      {parsedImport.errors.length}
                    </div>
                  </div>
                </div>

                {parsedImport.errors.length > 0 ? (
                  <div className="max-h-48 overflow-auto rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                    {parsedImport.errors.slice(0, 20).map((error) => (
                      <p key={`${error.rowNumber}-${error.message}`}>
                        Row {error.rowNumber}: {error.message}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <SheetFooter>
            <Button
              type="button"
              disabled={!parsedImport || isImportingRows || isParsingImport}
              onClick={() => void handleImportRows()}
            >
              {isImportingRows ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <UploadIcon className="size-4" />
              )}
              Import Valid Rows
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={isCompleteDialogOpen}
        onOpenChange={setIsCompleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Student Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCompleteIds.length === 1
                ? "This will mark the selected student as completed, append previous_assigned_sst history, and clear active assignment."
                : `This will complete ${pendingCompleteIds.length} selected students, append previous_assigned_sst history, and clear active assignments.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isCompleting}
              onClick={(event) => {
                event.preventDefault()
                void completePendingStudents()
              }}
            >
              {isCompleting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              Confirm Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
