"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  Loader2Icon,
  SearchIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import { createClient } from "@/lib/api/client"
import { getStudentProfilePath } from "@/lib/students/profile-path"
import { cn } from "@/lib/utils"
import { getRagLabel } from "@/lib/submissions/operations"
import type {
  ModuleStatus,
  SubmissionStudent,
  SubmissionStudentRpcRow,
  SubmissionSummary,
} from "@/lib/submissions/types"

type CohortOverviewDashboardProps = {
  initialStudents: SubmissionStudent[]
  initialTotalCount: number
  initialSummary: SubmissionSummary
  initialGroups: string[]
}

type DashboardFilters = {
  search: string
  group: string
  rag: "amber_red" | "amber" | "red" | "all"
}

const PAGE_SIZE = 20

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

function getRagBadgeClass(rag: SubmissionStudent["overall_rag"]) {
  if (rag === "red") {
    return "border-red-500/35 bg-red-500/12 text-red-800 dark:border-red-400/35 dark:bg-red-400/20 dark:text-red-100"
  }

  if (rag === "amber") {
    return "border-amber-500/35 bg-amber-500/14 text-amber-800 dark:border-amber-300/35 dark:bg-amber-300/18 dark:text-amber-100"
  }

  if (rag === "green") {
    return "border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-400/18 dark:text-emerald-100"
  }

  return "border-border/70 bg-muted/40 text-muted-foreground"
}

function getEngagementSignal(rag: SubmissionStudent["overall_rag"]) {
  if (rag === "red") return "Critical follow-up needed"
  if (rag === "amber") return "Monitor and intervene"
  if (rag === "green") return "Active and on track"
  return "Insufficient data"
}

function getStudentInitials(name: string | null, studentId: string) {
  const source = (name ?? "").trim()
  if (!source) {
    return studentId.slice(0, 2).toUpperCase()
  }

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("")
}

function getRowToneClass(rag: SubmissionStudent["overall_rag"]) {
  if (rag === "red") {
    return "bg-red-500/[0.04] hover:bg-red-500/[0.08]"
  }

  if (rag === "amber") {
    return "bg-amber-500/[0.05] hover:bg-amber-500/[0.1]"
  }

  return ""
}

function csvEscape(value: string | number) {
  const text = String(value ?? "")
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export function CohortOverviewDashboard({
  initialStudents,
  initialTotalCount,
  initialSummary,
  initialGroups,
}: CohortOverviewDashboardProps) {
  const router = useRouter()
  const apiClient = useMemo(() => createClient(), [])

  const [students, setStudents] = useState(initialStudents)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [summary, setSummary] = useState(initialSummary)

  const [search, setSearch] = useState("")
  const [groupFilter, setGroupFilter] = useState("")
  const [ragFilter, setRagFilter] =
    useState<DashboardFilters["rag"]>("amber_red")

  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState("1")
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false)

  const activeFilters = useMemo<DashboardFilters>(
    () => ({ search, group: groupFilter, rag: ragFilter }),
    [search, groupFilter, ragFilter]
  )

  const availableGroups = useMemo(
    () =>
      Array.from(new Set(initialGroups.filter((group) => Boolean(group)))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [initialGroups]
  )

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(currentPage * PAGE_SIZE, totalCount)

  const refreshSummary = useCallback(
    async (filters: DashboardFilters) => {
      setIsRefreshingSummary(true)

      const { data, error } = await apiClient.rpc<SubmissionSummary[]>(
        "get_submission_rag_summary_for_current_user",
        {
          p_search: filters.search.trim() || null,
          p_group: filters.group.trim() || null,
          p_rag: "all",
        }
      )

      if (error) {
        toast.error(error.message)
        setIsRefreshingSummary(false)
        return
      }

      const nextSummary =
        ((data ?? [])[0] as SubmissionSummary | undefined) ?? initialSummary

      setSummary(nextSummary)
      setIsRefreshingSummary(false)
    },
    [apiClient, initialSummary]
  )

  const fetchStudents = useCallback(
    async (page: number, filters: DashboardFilters) => {
      setIsLoading(true)

      const baseSearch = filters.search.trim() || null
      const baseGroup = filters.group.trim() || null

      if (filters.rag === "amber_red") {
        const { data, error } = await apiClient.rpc<SubmissionStudentRpcRow[]>(
          "list_student_submissions_paginated_for_current_user",
          {
            p_limit: 500,
            p_offset: 0,
            p_search: baseSearch,
            p_group: baseGroup,
            p_rag: "all",
          }
        )

        if (error) {
          toast.error(error.message)
          setStudents([])
          setTotalCount(0)
          setIsLoading(false)
          return
        }

        const allRows = (data ?? []) as SubmissionStudentRpcRow[]
        const riskRows = allRows.filter(
          (row) => row.overall_rag === "amber" || row.overall_rag === "red"
        )

        const start = (page - 1) * PAGE_SIZE
        const pageRows = riskRows.slice(start, start + PAGE_SIZE)

        setStudents(
          pageRows.map((row) => ({
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
            rated_modules: row.rated_modules,
            total_modules: row.total_modules,
          }))
        )
        setTotalCount(riskRows.length)
        setIsLoading(false)
        return
      }

      const { data, error } = await apiClient.rpc<SubmissionStudentRpcRow[]>(
        "list_student_submissions_paginated_for_current_user",
        {
          p_limit: PAGE_SIZE,
          p_offset: (page - 1) * PAGE_SIZE,
          p_search: baseSearch,
          p_group: baseGroup,
          p_rag: filters.rag,
        }
      )

      if (error) {
        toast.error(error.message)
        setStudents([])
        setTotalCount(0)
        setIsLoading(false)
        return
      }

      const rows = (data ?? []) as SubmissionStudentRpcRow[]
      setStudents(
        rows.map((row) => ({
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
          rated_modules: row.rated_modules,
          total_modules: row.total_modules,
        }))
      )
      setTotalCount(rows[0]?.total_count ?? 0)
      setIsLoading(false)
    },
    [apiClient]
  )

  async function applyFilters(next: Partial<DashboardFilters>) {
    const merged: DashboardFilters = {
      search: next.search ?? activeFilters.search,
      group: next.group ?? activeFilters.group,
      rag: next.rag ?? activeFilters.rag,
    }

    setCurrentPage(1)
    setPageInput("1")

    if (typeof next.search === "string") setSearch(next.search)
    if (typeof next.group === "string") setGroupFilter(next.group)
    if (typeof next.rag === "string") setRagFilter(next.rag)

    await fetchStudents(1, merged)
    await refreshSummary(merged)
  }

  async function goToPage(page: number) {
    const safePage = Math.min(Math.max(page, 1), totalPages)
    setCurrentPage(safePage)
    setPageInput(String(safePage))
    await fetchStudents(safePage, activeFilters)
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

  function handleExport() {
    if (students.length === 0) {
      toast.error("No students to export")
      return
    }

    const headers = [
      "Student ID",
      "Full name",
      "Group",
      "Cohort",
      "Intake",
      "Study level",
      "Completed modules",
      "Rated modules",
      "Overall RAG",
    ]

    const rows = students.map((student) => [
      csvEscape(student.student_id),
      csvEscape(student.full_name ?? ""),
      csvEscape(student.student_group ?? ""),
      csvEscape(student.cohort ?? ""),
      csvEscape(student.intake ?? ""),
      csvEscape(student.study_level ?? ""),
      csvEscape(student.completed_modules),
      csvEscape(student.rated_modules),
      csvEscape(getRagLabel(student.overall_rag)),
    ])

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    )

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `cohort-overview-page-${currentPage}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)

    toast.success("Exported current roster view")
  }

  const statCards = [
    {
      label: "Cohort size",
      value: summary.total_students,
      description: "Tracked students",
      valueClassName: "text-foreground",
    },
    {
      label: "Submission rate",
      value:
        summary.total_students > 0
          ? `${Math.round(((summary.green_count + summary.amber_count) / summary.total_students) * 100)}%`
          : "0%",
      description: "Green + amber coverage",
      valueClassName: "text-primary",
    },
    {
      label: "At risk",
      value: summary.amber_count,
      description: "Amber students",
      valueClassName: "text-amber-700 dark:text-amber-300",
    },
    {
      label: "Urgent",
      value: summary.red_count,
      description: "Red students",
      valueClassName: "text-red-700 dark:text-red-300",
    },
  ]

  function openStudentProfile(
    event:
      | React.MouseEvent<HTMLTableRowElement>
      | React.KeyboardEvent<HTMLTableRowElement>,
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
      <div className="dashboard-fade-up relative overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-background via-background to-primary/8 p-5 shadow-[0_22px_80px_-42px_var(--primary)] sm:p-7">
        <span
          aria-hidden
          className="dashboard-drift-slow pointer-events-none absolute -top-10 -right-6 size-36 rounded-full bg-primary/20 blur-3xl"
        />
        <span
          aria-hidden
          className="dashboard-drift-reverse pointer-events-none absolute -bottom-16 left-12 size-40 rounded-full bg-amber-400/15 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/45 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-border)_1px,transparent_1px)] bg-size-[18px_18px] opacity-60"
        />

        <header className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium tracking-[0.12em] text-primary uppercase">
              <SparklesIcon className="size-3.5" />
              Live support view
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Cohort overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Prioritize amber and red students while keeping the whole cohort
              in view.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-border/70 bg-background/70 transition-all hover:-translate-y-0.5 hover:shadow-md"
              onClick={handleExport}
            >
              <DownloadIcon className="size-4" />
              Export
            </Button>
            <Button
              asChild
              className="h-10 rounded-xl shadow-[0_12px_35px_-20px_var(--primary)] transition-all hover:-translate-y-0.5"
            >
              <Link href="/student-records">
                <AlertTriangleIcon className="size-4" />
                Log intervention
              </Link>
            </Button>
          </div>
        </header>

        <section className="relative z-10 mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, index) => (
            <article
              key={card.label}
              className={cn(
                "dashboard-fade-up rounded-2xl border border-border/70 bg-background/85 p-4 shadow-[0_12px_34px_-24px_rgba(0,0,0,0.65)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_20px_50px_-30px_var(--primary)]",
                index === 2 && "ring-1 ring-amber-500/20",
                index === 3 && "ring-1 ring-red-500/20"
              )}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                {card.label}
              </p>
              <p
                className={cn(
                  "mt-2 text-4xl leading-none font-semibold",
                  card.valueClassName
                )}
              >
                {card.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {card.description}
              </p>
            </article>
          ))}
        </section>
      </div>

      <section className="dashboard-fade-up dashboard-delay-2 mt-5 overflow-hidden rounded-3xl border border-border/70 bg-linear-to-b from-background via-background to-muted/22">
        <div className="border-b border-border/70 bg-muted/20 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Student roster</h2>
              <p className="text-sm text-muted-foreground">
                Amber and red students are highlighted for fast action.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/85 px-3 py-1 text-xs text-muted-foreground">
              <TriangleAlertIcon className="size-3.5 text-amber-600 dark:text-amber-300" />
              <span>Priority filter: {ragFilter.replace("_", " + ")}</span>
            </div>

            {isRefreshingSummary ? (
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2Icon className="size-3.5 animate-spin" />
                Updating summary
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) =>
                  void applyFilters({ search: event.target.value })
                }
                placeholder="Search by student ID, name, cohort"
                className="h-11 rounded-xl border-border/70 bg-background pl-11"
              />
            </div>

            <select
              value={groupFilter}
              onChange={(event) =>
                void applyFilters({ group: event.target.value })
              }
              className="h-11 rounded-xl border border-border/70 bg-background px-3 text-sm shadow-xs"
            >
              <option value="">All groups</option>
              {availableGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>

            <select
              value={ragFilter}
              onChange={(event) =>
                void applyFilters({
                  rag: event.target.value as DashboardFilters["rag"],
                })
              }
              className="h-11 rounded-xl border border-border/70 bg-background px-3 text-sm shadow-xs"
            >
              <option value="amber_red">Amber + Red</option>
              <option value="amber">Amber only</option>
              <option value="red">Red only</option>
              <option value="all">All RAG</option>
            </select>
          </div>
        </div>

        <div className="">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/25 hover:bg-muted/25">
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">
                  Student
                </TableHead>
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">
                  Group / cohort
                </TableHead>
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">
                  Submission signal
                </TableHead>
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">
                  Engagement signal
                </TableHead>
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">
                  Overall RAG
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-sm text-muted-foreground"
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
                    colSpan={5}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No students match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow
                    key={student.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "dashboard-fade-up cursor-pointer border-b border-border/60 transition-all",
                      getRowToneClass(student.overall_rag)
                    )}
                    onClick={(event) =>
                      openStudentProfile(event, student.student_id)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        openStudentProfile(event, student.student_id)
                      }
                    }}
                  >
                    <TableCell className="align-top">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-border/70 bg-linear-to-br from-background to-muted text-[11px] font-semibold text-muted-foreground">
                          {getStudentInitials(
                            student.full_name,
                            student.student_id
                          )}
                        </span>
                        <div>
                          <Link
                            href={getStudentProfilePath(student.student_id)}
                            className="font-semibold underline-offset-4 hover:underline"
                          >
                            {student.full_name ?? student.student_id}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            <Link
                              href={getStudentProfilePath(student.student_id)}
                              className="underline-offset-4 hover:underline"
                            >
                              {student.student_id}
                            </Link>
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <p className="text-sm">
                        {student.student_group ?? "Unassigned group"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.cohort ?? "No cohort"}
                        {student.intake ? ` · ${student.intake}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      <span className="text-sm font-medium">
                        {student.completed_modules} of {student.rated_modules}{" "}
                        rated modules complete
                      </span>
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {getEngagementSignal(student.overall_rag)}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
                          getRagBadgeClass(student.overall_rag)
                        )}
                      >
                        {getRagLabel(student.overall_rag)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3 sm:px-6">
          <p className="text-sm text-muted-foreground">
            Showing {showingFrom} - {showingTo} of {totalCount}
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => void goToPage(currentPage - 1)}
              className="transition-all hover:-translate-y-0.5"
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
              className="h-9 w-20"
              placeholder="Page"
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => void handlePageJump()}
              className="transition-all hover:-translate-y-0.5"
            >
              Go
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => void goToPage(currentPage + 1)}
              className="transition-all hover:-translate-y-0.5"
            >
              Next
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
