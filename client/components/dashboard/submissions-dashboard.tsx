"use client"

import { useCallback, useMemo, useState } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getCompletedCountAfterStatusChange,
  getRagFromCompletion,
  getRagLabel,
  getRatedCountAfterStatusChange,
} from "@/lib/submissions/operations"
import {
  moduleStatuses,
  type ModuleStatus,
  type SubmissionModule,
  type SubmissionStudent,
  type SubmissionStudentRpcRow,
  type SubmissionSummary,
} from "@/lib/submissions/types"
import { createClient } from "@/lib/api/client"

type SubmissionsDashboardProps = {
  initialModules: SubmissionModule[]
  initialStudents: SubmissionStudent[]
  initialTotalCount: number
  initialSummary: SubmissionSummary
  initialGroups: string[]
}

type SubmissionsFilters = {
  search: string
  group: string
  rag: "all" | "green" | "amber" | "red" | "not_set"
}

const SUBMISSIONS_PAGE_SIZE = 20

function getStatusCellClass(status: ModuleStatus) {
  if (status === "yes") {
    return "border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-400/18 dark:text-emerald-200"
  }

  if (status === "no") {
    return "border-red-500/35 bg-red-500/10 text-red-800 dark:border-red-400/35 dark:bg-red-400/16 dark:text-red-200"
  }

  if (status === "extension") {
    return "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:border-amber-300/35 dark:bg-amber-300/18 dark:text-amber-100"
  }

  return "border-border/70 bg-muted/30 text-foreground/80 dark:bg-zinc-900/85 dark:text-zinc-200"
}

function getRagBadgeClass(overallRag: SubmissionsFilters["rag"]) {
  if (overallRag === "green") {
    return "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/25 dark:text-emerald-100"
  }

  if (overallRag === "amber") {
    return "bg-amber-500/20 text-amber-800 dark:bg-amber-300/28 dark:text-amber-100"
  }

  if (overallRag === "red") {
    return "bg-red-500/15 text-red-800 dark:bg-red-400/25 dark:text-red-100"
  }

  return "bg-muted text-muted-foreground dark:bg-zinc-700/60 dark:text-zinc-200"
}

function parseModuleStatuses(input: unknown) {
  const result: Record<string, ModuleStatus> = {}

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return result
  }

  for (const [moduleId, status] of Object.entries(input)) {
    if (
      typeof status === "string" &&
      moduleStatuses.includes(status as ModuleStatus)
    ) {
      result[moduleId] = status as ModuleStatus
    }
  }

  return result
}

export function SubmissionsDashboard({
  initialModules,
  initialStudents,
  initialTotalCount,
  initialSummary,
  initialGroups,
}: SubmissionsDashboardProps) {
  const apiClient = useMemo(() => createClient(), [])

  const [modules, setModules] = useState(initialModules)
  const [students, setStudents] = useState(initialStudents)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [summary, setSummary] = useState(initialSummary)
  const [availableGroups] = useState(initialGroups)

  const [search, setSearch] = useState("")
  const [groupFilter, setGroupFilter] = useState("")
  const [ragFilter, setRagFilter] = useState<SubmissionsFilters["rag"]>("all")

  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false)
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [moduleNameInput, setModuleNameInput] = useState("")
  const [isCreatingModule, setIsCreatingModule] = useState(false)
  const [deletingModuleIds, setDeletingModuleIds] = useState<Set<number>>(
    new Set()
  )

  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState("1")
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null)

  const activeFilters = useMemo<SubmissionsFilters>(
    () => ({ search, group: groupFilter, rag: ragFilter }),
    [search, groupFilter, ragFilter]
  )

  const totalPages = Math.max(1, Math.ceil(totalCount / SUBMISSIONS_PAGE_SIZE))

  const refreshSummary = useCallback(
    async (filters: SubmissionsFilters) => {
      setIsRefreshingSummary(true)
      const { data, error } = await apiClient.rpc<SubmissionSummary[]>(
        "get_submission_rag_summary_for_current_user",
        {
          p_search: filters.search.trim() || null,
          p_group: filters.group.trim() || null,
          p_rag: filters.rag,
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
    [initialSummary, apiClient]
  )

  const refreshModules = useCallback(async () => {
    const { data, error } = await apiClient.rpc<SubmissionModule[]>(
      "list_modules_for_current_user"
    )

    if (error) {
      toast.error(error.message)
      return
    }

    setModules((data ?? []) as SubmissionModule[])
  }, [apiClient])

  const fetchStudents = useCallback(
    async (page: number, filters: SubmissionsFilters) => {
      setIsLoadingStudents(true)
      const offset = (page - 1) * SUBMISSIONS_PAGE_SIZE

      const { data, error } = await apiClient.rpc<SubmissionStudentRpcRow[]>(
        "list_student_submissions_paginated_for_current_user",
        {
          p_limit: SUBMISSIONS_PAGE_SIZE,
          p_offset: offset,
          p_search: filters.search.trim() || null,
          p_group: filters.group.trim() || null,
          p_rag: filters.rag,
        }
      )

      if (error) {
        toast.error(error.message)
        setStudents([])
        setTotalCount(0)
        setIsLoadingStudents(false)
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
      setIsLoadingStudents(false)
    },
    [apiClient]
  )

  async function applyFilters(next: Partial<SubmissionsFilters>) {
    const merged: SubmissionsFilters = {
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

  async function handleCreateModule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const moduleName = moduleNameInput.trim().replace(/\s+/g, " ")
    if (moduleName.length < 2) {
      toast.error("Module name must be at least 2 characters")
      return
    }

    setIsCreatingModule(true)

    const { data, error } = await apiClient.rpc<
      Array<{ module_name: string; was_created: boolean }>
    >("create_module_for_current_user", {
      p_module_name: moduleName,
    })

    setIsCreatingModule(false)

    if (error) {
      if (
        error.code === "23505" ||
        error.message.toLowerCase().includes("duplicate")
      ) {
        toast.error("Module already exists in your account")
      } else {
        toast.error(error.message)
      }
      return
    }

    const result = (data ?? [])[0] as
      | { module_name: string; was_created: boolean }
      | undefined

    if (result?.was_created) {
      toast.success(`Created module ${result.module_name}`)
    } else {
      toast.message("Module already existed; students were synced")
    }

    setModuleNameInput("")
    await refreshModules()
    await fetchStudents(1, activeFilters)
    await refreshSummary(activeFilters)
  }

  async function handleDeleteModule(moduleId: number) {
    setDeletingModuleIds((current) => new Set(current).add(moduleId))

    const { error } = await apiClient.rpc(
      "delete_sst_module_for_current_user",
      {
        p_module_id: moduleId,
      }
    )

    setDeletingModuleIds((current) => {
      const next = new Set(current)
      next.delete(moduleId)
      return next
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Module removed")
    await refreshModules()
    await fetchStudents(1, activeFilters)
    await refreshSummary(activeFilters)
  }

  async function handleModuleStatusChange(
    student: SubmissionStudent,
    moduleId: number,
    nextStatus: ModuleStatus
  ) {
    const moduleKey = String(moduleId)
    const currentStatus = student.module_statuses[moduleKey] ?? "not_set"

    if (currentStatus === nextStatus) {
      return
    }

    const cellKey = `${student.student_id}:${moduleId}`
    setSavingCellKey(cellKey)

    const { data, error } = await apiClient.rpc<
      Array<{ overall_rag: SubmissionStudent["overall_rag"] }>
    >("set_student_module_status_for_current_user", {
      p_student_id: student.student_id,
      p_module_id: moduleId,
      p_completion_status: nextStatus,
    })

    setSavingCellKey(null)

    if (error) {
      toast.error(error.message)
      return
    }

    const result = (data ?? [])[0] as
      | {
          overall_rag: SubmissionStudent["overall_rag"]
        }
      | undefined

    const completedModules = getCompletedCountAfterStatusChange(
      student.completed_modules,
      currentStatus,
      nextStatus
    )
    const ratedModules = getRatedCountAfterStatusChange(
      student.rated_modules,
      currentStatus,
      nextStatus
    )
    const fallbackRag = getRagFromCompletion(completedModules, ratedModules)

    setStudents((current) =>
      current.map((row) => {
        if (row.id !== student.id) return row

        return {
          ...row,
          module_statuses: {
            ...row.module_statuses,
            [moduleKey]: nextStatus,
          },
          completed_modules: completedModules,
          rated_modules: ratedModules,
          overall_rag: result?.overall_rag ?? fallbackRag,
        }
      })
    )

    void refreshSummary(activeFilters)
  }

  const summaryCards = [
    {
      label: "Green",
      value: summary.green_count,
      className: "text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Amber",
      value: summary.amber_count,
      className: "text-amber-700 dark:text-amber-300",
    },
    {
      label: "Red",
      value: summary.red_count,
      className: "text-red-700 dark:text-red-300",
    },
    {
      label: "Not set",
      value: summary.not_set_count,
      className: "text-zinc-700 dark:text-zinc-300",
    },
  ]

  const tableColSpan = Math.max(6, modules.length + 3)

  return (
    <>
      <div className="px-4 py-5 sm:px-7 sm:py-6">
        <header className="rounded-3xl border border-border/70 bg-linear-to-r from-background via-muted/35 to-background p-5 shadow-[0_18px_50px_-40px_var(--primary)] sm:p-6 dark:from-black/80 dark:via-zinc-950/90 dark:to-black/80">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Submissions
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.total_modules} module
                {summary.total_modules === 1 ? "" : "s"} tracked · RAG
                calculated from module completion
              </p>
            </div>
            <Button
              className="h-11 rounded-2xl border-border/70 px-5 dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-800/90"
              variant="outline"
              onClick={() => setIsManageOpen(true)}
            >
              <Settings2Icon className="size-4" />
              Manage modules
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-border/70 bg-background/85 p-4 dark:bg-zinc-900/75"
              >
                <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  {card.label}
                </p>
                <p className={`mt-2 text-3xl font-semibold ${card.className}`}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        </header>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                const nextSearch = event.target.value
                void applyFilters({ search: nextSearch })
              }}
              placeholder="Search by student ID or name"
              className="h-11 rounded-2xl border-border/70 bg-muted/25 pl-11 text-foreground placeholder:text-muted-foreground dark:bg-zinc-900/75 dark:text-zinc-100 dark:placeholder:text-zinc-400"
            />
          </div>

          <select
            value={groupFilter}
            onChange={(event) => {
              void applyFilters({ group: event.target.value })
            }}
            className="h-11 rounded-2xl border border-border/70 bg-muted/25 px-3 text-sm text-foreground dark:bg-zinc-900/75 dark:text-zinc-100"
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
            onChange={(event) => {
              void applyFilters({
                rag: event.target.value as SubmissionsFilters["rag"],
              })
            }}
            className="h-11 rounded-2xl border border-border/70 bg-muted/25 px-3 text-sm text-foreground dark:bg-zinc-900/75 dark:text-zinc-100"
          >
            <option value="all">All RAG</option>
            <option value="green">Green</option>
            <option value="amber">Amber</option>
            <option value="red">Red</option>
            <option value="not_set">Not set</option>
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border/70 bg-background dark:bg-black/70">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/35 hover:bg-muted/35 dark:bg-zinc-900/80 dark:hover:bg-zinc-900/80">
                <TableHead className="text-xs tracking-[0.12em] text-muted-foreground uppercase dark:text-zinc-300">
                  Student ID
                </TableHead>
                <TableHead className="text-xs tracking-[0.12em] text-muted-foreground uppercase dark:text-zinc-300">
                  Name
                </TableHead>
                {modules.map((module) => (
                  <TableHead
                    key={module.module_id}
                    className="min-w-52.5 text-xs tracking-[0.12em] text-muted-foreground uppercase dark:text-zinc-300"
                  >
                    {module.module_name}
                  </TableHead>
                ))}
                <TableHead className="text-xs tracking-[0.12em] text-muted-foreground uppercase dark:text-zinc-300">
                  Overall RAG
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingStudents ? (
                <TableRow>
                  <TableCell
                    colSpan={tableColSpan}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2Icon className="size-4 animate-spin" />
                      Loading submissions...
                    </span>
                  </TableCell>
                </TableRow>
              ) : modules.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={tableColSpan}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No modules yet. Use Manage modules to create your first
                    module.
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={tableColSpan}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No students match your current filters.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow
                    key={student.id}
                    className="dark:hover:bg-zinc-900/55"
                  >
                    <TableCell className="font-semibold tracking-tight text-foreground dark:text-zinc-100">
                      {student.student_id}
                    </TableCell>
                    <TableCell className="text-foreground dark:text-zinc-200">
                      {student.full_name ?? "-"}
                    </TableCell>
                    {modules.map((module) => {
                      const moduleKey = String(module.module_id)
                      const status =
                        student.module_statuses[moduleKey] ?? "not_set"
                      const cellKey = `${student.student_id}:${module.module_id}`

                      return (
                        <TableCell key={module.module_id}>
                          <div className="relative">
                            <select
                              value={status}
                              onChange={(event) => {
                                void handleModuleStatusChange(
                                  student,
                                  module.module_id,
                                  event.target.value as ModuleStatus
                                )
                              }}
                              className={`h-10 w-full rounded-xl border px-3 text-sm shadow-inner transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${getStatusCellClass(status)}`}
                            >
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                              <option value="extension">Extension</option>
                              <option value="not_set">Not set</option>
                            </select>
                            {savingCellKey === cellKey ? (
                              <Loader2Icon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                            ) : null}
                          </div>
                        </TableCell>
                      )
                    })}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={getRagBadgeClass(student.overall_rag)}
                          variant="secondary"
                        >
                          {getRagLabel(student.overall_rag)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {student.completed_modules}/{student.rated_modules}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            {Math.min(
              (currentPage - 1) * SUBMISSIONS_PAGE_SIZE + 1,
              totalCount
            )}
            {" - "}
            {Math.min(currentPage * SUBMISSIONS_PAGE_SIZE, totalCount)} of{" "}
            {totalCount}
            {isRefreshingSummary ? " · refreshing summary..." : ""}
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

      <Sheet open={isManageOpen} onOpenChange={setIsManageOpen}>
        <SheetContent
          side="right"
          className="w-full bg-background/95 backdrop-blur-sm sm:max-w-xl dark:bg-black/95"
        >
          <SheetHeader>
            <SheetTitle>Manage modules</SheetTitle>
            <SheetDescription>
              Add modules to your account. Every active student assigned to you
              is automatically linked to new modules.
            </SheetDescription>
          </SheetHeader>

          <form className="space-y-4 px-6" onSubmit={handleCreateModule}>
            <div className="space-y-2">
              <label
                htmlFor="moduleName"
                className="text-sm text-muted-foreground"
              >
                New module name
              </label>
              <Input
                id="moduleName"
                value={moduleNameInput}
                onChange={(event) => setModuleNameInput(event.target.value)}
                placeholder="e.g. Applied Research Project"
                className="h-10 dark:bg-zinc-900/75 dark:text-zinc-100 dark:placeholder:text-zinc-400"
              />
            </div>

            <SheetFooter className="px-0">
              <Button type="submit" disabled={isCreatingModule}>
                {isCreatingModule ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <PlusIcon className="size-4" />
                )}
                Add module
              </Button>
            </SheetFooter>
          </form>

          <div className="mt-5 space-y-2 px-6">
            <h3 className="text-sm font-medium">Current modules</h3>
            <div className="space-y-2">
              {modules.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                  No modules added yet.
                </p>
              ) : (
                modules.map((module) => {
                  const isDeleting = deletingModuleIds.has(module.module_id)
                  return (
                    <div
                      key={module.module_id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2 dark:bg-zinc-900/70"
                    >
                      <p className="text-sm text-foreground dark:text-zinc-100">
                        {module.module_name}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-500/10 hover:text-red-700"
                        disabled={isDeleting}
                        onClick={() =>
                          void handleDeleteModule(module.module_id)
                        }
                      >
                        {isDeleting ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <Trash2Icon className="size-4" />
                        )}
                        Remove
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
