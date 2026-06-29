"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/api/client"
import {
  interactionTypes,
  interventionOutcomes,
  issueCategories,
  type InterventionOutcome,
  type InterventionStudentOption,
  type IssueCategory,
  type StudentIntervention,
  type StudentInterventionWithTotal,
} from "@/lib/student-records/types"
import {
  createInterventionSchema,
  type CreateInterventionInput,
} from "@/lib/validations/student-records"
import { getStudentProfilePath } from "@/lib/students/profile-path"

type StudentRecordsDashboardProps = {
  currentUserId: string | null
  initialInterventions: StudentIntervention[]
  initialTotalCount: number
  initialStudentOptions: InterventionStudentOption[]
  initialSearch?: string
}

type InterventionFilters = {
  search: string
  issueCategory: "all" | IssueCategory
  outcome: "all" | InterventionOutcome
}

type InterventionFormState = {
  studentId: string
  studentQuery: string
  interactionType: (typeof interactionTypes)[number]
  outcome: InterventionOutcome
  issueCategory: IssueCategory
  notes: string
  actionItem: string
  nextPlannedContact: string
}

const INTERVENTIONS_PAGE_SIZE = 8

const emptyInterventionForm: InterventionFormState = {
  studentId: "",
  studentQuery: "",
  interactionType: "Call - Connected",
  outcome: "Successful",
  issueCategory: "Academic",
  notes: "",
  actionItem: "",
  nextPlannedContact: "",
}

function formatShortDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "-"
  }

  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  })
}

function formatLongDate(value: string | null) {
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

function getInitials(input: string | null, fallback: string) {
  const value = (input ?? "").trim()
  if (!value) {
    return fallback.slice(0, 2).toUpperCase()
  }

  const parts = value.split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function StudentRecordsDashboard({
  currentUserId,
  initialInterventions,
  initialTotalCount,
  initialStudentOptions,
  initialSearch = "",
}: StudentRecordsDashboardProps) {
  const router = useRouter()
  const apiClient = useMemo(() => createClient(), [])

  const [interventions, setInterventions] =
    useState<StudentIntervention[]>(initialInterventions)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [search, setSearch] = useState(initialSearch)
  const [issueCategoryFilter, setIssueCategoryFilter] =
    useState<InterventionFilters["issueCategory"]>("all")
  const [outcomeFilter, setOutcomeFilter] =
    useState<InterventionFilters["outcome"]>("all")
  const [isLoadingInterventions, setIsLoadingInterventions] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState("1")

  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [formState, setFormState] = useState<InterventionFormState>(
    emptyInterventionForm
  )
  const [isSavingIntervention, setIsSavingIntervention] = useState(false)

  const [studentOptions, setStudentOptions] = useState<
    InterventionStudentOption[]
  >(initialStudentOptions)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isStudentMenuOpen, setIsStudentMenuOpen] = useState(false)

  const activeFilters = useMemo<InterventionFilters>(
    () => ({
      search,
      issueCategory: issueCategoryFilter,
      outcome: outcomeFilter,
    }),
    [search, issueCategoryFilter, outcomeFilter]
  )

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / INTERVENTIONS_PAGE_SIZE)
  )

  const selectedStudent = useMemo(
    () => studentOptions.find((row) => row.student_id === formState.studentId),
    [formState.studentId, studentOptions]
  )

  const assignedStudentOptions = useMemo(
    () =>
      studentOptions.filter(
        (student) => student.assigned_sst === currentUserId || !currentUserId
      ),
    [currentUserId, studentOptions]
  )

  const unassignedStudentOptions = useMemo(
    () =>
      studentOptions.filter(
        (student) =>
          student.assigned_sst !== currentUserId && Boolean(currentUserId)
      ),
    [currentUserId, studentOptions]
  )

  const fetchInterventions = useCallback(
    async (page: number, filters: InterventionFilters) => {
      setIsLoadingInterventions(true)

      const offset = (page - 1) * INTERVENTIONS_PAGE_SIZE
      const { data, error } = await apiClient.rpc(
        "list_student_interventions_paginated",
        {
          p_limit: INTERVENTIONS_PAGE_SIZE,
          p_offset: offset,
          p_search: filters.search.trim() || null,
          p_issue_category: filters.issueCategory,
          p_outcome: filters.outcome,
        }
      )

      if (error) {
        toast.error(error.message)
        setInterventions([])
        setTotalCount(0)
        setIsLoadingInterventions(false)
        return
      }

      const rows = (data ?? []) as StudentInterventionWithTotal[]
      setInterventions(
        rows.map((row) => ({
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
      )
      setTotalCount(rows[0]?.total_count ?? 0)
      setIsLoadingInterventions(false)
    },
    [apiClient]
  )

  const fetchStudentOptions = useCallback(
    async (query: string) => {
      setIsLoadingStudents(true)

      const { data, error } = await apiClient.rpc(
        "search_students_for_intervention",
        {
          p_limit: 40,
          p_search: query.trim() || null,
        }
      )

      setIsLoadingStudents(false)

      if (error) {
        toast.error(error.message)
        return
      }

      setStudentOptions((data ?? []) as InterventionStudentOption[])
    },
    [apiClient]
  )

  useEffect(() => {
    if (!isLogModalOpen) {
      return
    }

    const timeout = setTimeout(() => {
      void fetchStudentOptions(formState.studentQuery)
    }, 220)

    return () => clearTimeout(timeout)
  }, [fetchStudentOptions, formState.studentQuery, isLogModalOpen])

  async function applyFilters(next: Partial<InterventionFilters>) {
    const merged: InterventionFilters = {
      search: next.search ?? activeFilters.search,
      issueCategory: next.issueCategory ?? activeFilters.issueCategory,
      outcome: next.outcome ?? activeFilters.outcome,
    }

    setCurrentPage(1)
    setPageInput("1")

    if (typeof next.search === "string") setSearch(next.search)
    if (next.issueCategory) setIssueCategoryFilter(next.issueCategory)
    if (next.outcome) setOutcomeFilter(next.outcome)

    await fetchInterventions(1, merged)
  }

  async function goToPage(page: number) {
    const safePage = Math.min(Math.max(page, 1), totalPages)
    setCurrentPage(safePage)
    setPageInput(String(safePage))
    await fetchInterventions(safePage, activeFilters)
  }

  async function handlePageJump() {
    const parsedPage = Number(pageInput)

    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      toast.error("Enter a valid page number")
      setPageInput(String(currentPage))
      return
    }

    await goToPage(parsedPage)
  }

  function openLogModal() {
    setFormState(emptyInterventionForm)
    setIsStudentMenuOpen(true)
    setIsLogModalOpen(true)
    void fetchStudentOptions("")
  }

  function selectStudent(option: InterventionStudentOption) {
    setFormState((current) => ({
      ...current,
      studentId: option.student_id,
      studentQuery: option.full_name
        ? `${option.full_name} (${option.student_id})`
        : option.student_id,
    }))
    setIsStudentMenuOpen(false)
  }

  function updateFormField<K extends keyof InterventionFormState>(
    key: K,
    value: InterventionFormState[K]
  ) {
    setFormState((current) => ({ ...current, [key]: value }))
  }

  async function handleLogInterventionSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const parsed = createInterventionSchema.safeParse({
      studentId: formState.studentId,
      interactionType: formState.interactionType,
      outcome: formState.outcome,
      issueCategory: formState.issueCategory,
      notes: formState.notes,
      actionItem: formState.actionItem,
      nextPlannedContact: formState.nextPlannedContact,
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form input")
      return
    }

    const input = parsed.data as CreateInterventionInput
    setIsSavingIntervention(true)

    const { error } = await apiClient.rpc("create_student_intervention", {
      p_student_id: input.studentId,
      p_interaction_type: input.interactionType,
      p_outcome: input.outcome,
      p_issue_category: input.issueCategory,
      p_notes: input.notes,
      p_action_item: input.actionItem,
      p_next_planned_contact: input.nextPlannedContact,
    })

    setIsSavingIntervention(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Intervention logged")
    setIsLogModalOpen(false)
    setFormState(emptyInterventionForm)

    setCurrentPage(1)
    setPageInput("1")
    await fetchInterventions(1, activeFilters)
  }

  function openStudentProfile(
    event: React.MouseEvent<HTMLLIElement> | React.KeyboardEvent<HTMLLIElement>,
    studentId: string
  ) {
    const target = event.target as HTMLElement
    if (target.closest("a,button,input,select,textarea,[role='button']")) {
      return
    }

    router.push(getStudentProfilePath(studentId))
  }

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-6">
      <div className="rounded-3xl border border-border/70 bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Student records
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {totalCount} logged interactions across all students · page{" "}
              {currentPage} of {totalPages}
            </p>
          </div>

          <Button size="lg" onClick={openLogModal} className="sm:mt-1">
            <PlusIcon className="size-4" />
            Log intervention
          </Button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void applyFilters({ search })
                }
              }}
              className="pl-9"
              placeholder="Search by student, ID, notes or action item"
            />
          </div>

          <Select
            value={issueCategoryFilter}
            onValueChange={(value) =>
              void applyFilters({
                issueCategory: value as InterventionFilters["issueCategory"],
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All categories</SelectItem>
              {issueCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={outcomeFilter}
            onValueChange={(value) =>
              void applyFilters({
                outcome: value as InterventionFilters["outcome"],
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All outcomes" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All outcomes</SelectItem>
              {interventionOutcomes.map((outcome) => (
                <SelectItem key={outcome} value={outcome}>
                  {outcome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {isLoadingInterventions ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading records
            </div>
          ) : interventions.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-muted-foreground">
              No interventions found for this filter.
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {interventions.map((record) => (
                <li
                  key={record.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer p-5 transition-colors hover:bg-muted/20"
                  onClick={(event) =>
                    openStudentProfile(event, record.student_id)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      openStudentProfile(event, record.student_id)
                    }
                  }}
                >
                  <div className="flex gap-4">
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted text-xs font-medium text-muted-foreground">
                      {getInitials(record.student_name, record.student_id)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link
                            href={getStudentProfilePath(record.student_id)}
                            className="font-semibold text-foreground underline-offset-4 hover:underline"
                          >
                            {record.student_name ?? "Unknown student"}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            <Link
                              href={getStudentProfilePath(record.student_id)}
                              className="underline-offset-4 hover:underline"
                            >
                              {record.student_id}
                            </Link>
                          </p>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {formatShortDate(record.created_at)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-foreground">
                          {record.interaction_type}
                        </span>
                        <Badge variant="outline">{record.issue_category}</Badge>
                        <Badge
                          className={
                            record.outcome === "Successful"
                              ? "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/30 dark:text-emerald-100"
                              : "bg-amber-500/15 text-amber-800 dark:bg-amber-300/30 dark:text-amber-100"
                          }
                        >
                          {record.outcome}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm text-foreground/90">
                        {record.notes}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground/90">
                          Action:
                        </span>{" "}
                        {record.action_item}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <p>Logged by {record.logged_by_name}</p>
                        <p>
                          Next contact{" "}
                          {formatLongDate(record.next_planned_contact)}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing page {currentPage} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void goToPage(currentPage - 1)}
              disabled={currentPage <= 1 || isLoadingInterventions}
            >
              <ChevronLeftIcon className="size-4" />
              Prev
            </Button>

            <div className="flex items-center gap-2 rounded-4xl border border-border/70 bg-muted/40 px-2 py-1">
              <span className="pl-1 text-xs text-muted-foreground">Page</span>
              <Input
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void handlePageJump()
                  }
                }}
                className="h-8 w-16 bg-background text-center"
                inputMode="numeric"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void handlePageJump()}
              >
                Go
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => void goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoadingInterventions}
            >
              Next
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLogModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-border/70 bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b border-border/70 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Log intervention
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Capture contact outcomes and the next planned follow-up.
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsLogModalOpen(false)}
                aria-label="Close log intervention modal"
              >
                <XIcon className="size-4" />
              </Button>
            </div>

            <form
              onSubmit={handleLogInterventionSubmit}
              className="max-h-[78vh] overflow-y-auto"
            >
              <div className="space-y-4 px-6 py-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Student ID
                  </label>
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={formState.studentQuery}
                      onFocus={() => setIsStudentMenuOpen(true)}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setFormState((current) => ({
                          ...current,
                          studentQuery: nextValue,
                          studentId: "",
                        }))
                        setIsStudentMenuOpen(true)
                      }}
                      className="pl-9"
                      placeholder="Search for student by name or ID"
                    />

                    {isStudentMenuOpen ? (
                      <div className="absolute top-[calc(100%+6px)] z-10 w-full overflow-hidden rounded-2xl border border-border/70 bg-popover shadow-xl">
                        {isLoadingStudents ? (
                          <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                            <Loader2Icon className="size-4 animate-spin" />
                            Loading students
                          </div>
                        ) : studentOptions.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-muted-foreground">
                            No students found
                          </div>
                        ) : (
                          <div className="max-h-64 overflow-y-auto py-1">
                            {assignedStudentOptions.map((option) => (
                              <button
                                key={option.student_id}
                                type="button"
                                onClick={() => selectStudent(option)}
                                className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                              >
                                <span>
                                  <span className="block text-sm font-medium">
                                    {option.full_name ?? "Unknown student"}
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    {option.student_id}
                                  </span>
                                </span>
                                {option.status === "completed" ? (
                                  <Badge variant="outline">Completed</Badge>
                                ) : null}
                              </button>
                            ))}

                            {currentUserId &&
                            unassignedStudentOptions.length > 0 ? (
                              <>
                                <div className="my-1 border-t border-border/70 px-3 pt-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                  Not assigned students
                                </div>

                                {unassignedStudentOptions.map((option) => (
                                  <button
                                    key={option.student_id}
                                    type="button"
                                    onClick={() => selectStudent(option)}
                                    className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                                  >
                                    <span>
                                      <span className="block text-sm font-medium">
                                        {option.full_name ?? "Unknown student"}
                                      </span>
                                      <span className="block text-xs text-muted-foreground">
                                        {option.student_id}
                                      </span>
                                    </span>
                                    {option.status === "completed" ? (
                                      <Badge variant="outline">Completed</Badge>
                                    ) : null}
                                  </button>
                                ))}
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {selectedStudent ? (
                    <p className="text-xs text-muted-foreground">
                      Selected: {selectedStudent.full_name ?? "Unknown student"}{" "}
                      ({selectedStudent.student_id})
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Interaction Type
                    </label>
                    <Select
                      value={formState.interactionType}
                      onValueChange={(value) =>
                        updateFormField(
                          "interactionType",
                          value as (typeof interactionTypes)[number]
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select interaction type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {interactionTypes.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Outcome
                    </label>
                    <Select
                      value={formState.outcome}
                      onValueChange={(value) =>
                        updateFormField("outcome", value as InterventionOutcome)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {interventionOutcomes.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Issue Category
                    </label>
                    <Select
                      value={formState.issueCategory}
                      onValueChange={(value) =>
                        updateFormField("issueCategory", value as IssueCategory)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select issue category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Categories</SelectLabel>
                          {issueCategories.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Next planned contact
                    </label>
                    <div className="relative">
                      <CalendarDaysIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        value={formState.nextPlannedContact}
                        onChange={(event) =>
                          updateFormField(
                            "nextPlannedContact",
                            event.target.value
                          )
                        }
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Outcome / notes
                  </label>
                  <Textarea
                    value={formState.notes}
                    onChange={(event) =>
                      updateFormField("notes", event.target.value)
                    }
                    placeholder="e.g, Spoke to student, discussed missed deadline."
                    className="min-h-24"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Action Item
                  </label>
                  <Textarea
                    value={formState.actionItem}
                    onChange={(event) =>
                      updateFormField("actionItem", event.target.value)
                    }
                    placeholder="e.g, Send extension paperwork, follow up Friday"
                    className="min-h-20"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsLogModalOpen(false)}
                  disabled={isSavingIntervention}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingIntervention}>
                  {isSavingIntervention ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    "Log intervention"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
