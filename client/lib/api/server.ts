import { BackendRequestError, backendRequest } from "@/lib/api/backend"
import {
  clearSessionData,
  getSessionData,
  setSessionData,
} from "@/lib/api/session"

type AuthUser = {
  id: string
  fullName: string
  email: string
  role: "admin" | "sst"
}

type RpcResponse<T> = {
  data: T | null
  error: { message: string; code?: string } | null
}

function mapError(error: unknown): { message: string; code?: string } {
  if (error instanceof BackendRequestError && error.status === 401) {
    return {
      message: "Session expired. Please sign in again.",
      code: "UNAUTHORIZED",
    }
  }

  return {
    message: error instanceof Error ? error.message : "Unexpected error",
  }
}

async function runRpc(name: string, args: Record<string, unknown> = {}) {
  try {
    const session = await getSessionData()
    const token = session?.token

    if (!token) {
      return {
        data: null,
        error: { message: "Unauthorized" },
      }
    }

    if (name === "list_students_paginated_for_current_user") {
      const query = new URLSearchParams({
        limit: String(args.p_limit ?? 20),
        offset: String(args.p_offset ?? 0),
        search: String(args.p_search ?? ""),
        status: String(args.p_status ?? "all"),
        group: String(args.p_group ?? ""),
      })

      const result = await backendRequest<{
        rows: Array<Record<string, unknown>>
        totalCount: number
      }>(`/api/students?${query.toString()}`, { token })

      const rows = result.rows.map((row) => ({
        ...row,
        total_count: result.totalCount,
      }))

      return { data: rows, error: null }
    }

    if (name === "list_student_groups_for_current_user") {
      const result = await backendRequest<{ groups: string[] }>(
        "/api/students/groups",
        { token }
      )

      return {
        data: result.groups.map((group) => ({ student_group: group })),
        error: null,
      }
    }

    if (name === "upsert_student_for_current_user") {
      await backendRequest("/api/students/upsert", {
        method: "POST",
        token,
        body: {
          student_id: args.p_student_id,
          full_name: args.p_full_name,
          phone: args.p_phone,
          personal_email: args.p_personal_email,
          school_email: args.p_school_email,
          student_group: args.p_student_group,
          cohort: args.p_cohort,
          intake: args.p_intake,
          study_level: args.p_study_level,
        },
      })

      return { data: [], error: null }
    }

    if (name === "complete_students") {
      const result = await backendRequest<{
        rows: Array<{ student_id: string; outcome: string }>
      }>("/api/students/complete", {
        method: "POST",
        token,
        body: { student_ids: args.p_student_ids },
      })

      return { data: result.rows, error: null }
    }

    if (name === "list_modules_for_current_user") {
      const result = await backendRequest<{
        modules: Array<{
          module_id: number
          module_name: string
          created_at: string
        }>
      }>("/api/submissions/modules", { token })

      return { data: result.modules, error: null }
    }

    if (name === "list_student_submissions_paginated_for_current_user") {
      const query = new URLSearchParams({
        limit: String(args.p_limit ?? 20),
        offset: String(args.p_offset ?? 0),
        search: String(args.p_search ?? ""),
        group: String(args.p_group ?? ""),
        rag: String(args.p_rag ?? "all"),
      })

      const result = await backendRequest<{
        rows: Array<Record<string, unknown>>
        totalCount: number
      }>(`/api/submissions/students?${query.toString()}`, { token })

      const rows = result.rows.map((row) => ({
        ...row,
        total_count: result.totalCount,
      }))

      return { data: rows, error: null }
    }

    if (name === "get_submission_rag_summary_for_current_user") {
      const query = new URLSearchParams({
        search: String(args.p_search ?? ""),
        group: String(args.p_group ?? ""),
        rag: String(args.p_rag ?? "all"),
      })

      const result = await backendRequest<Record<string, unknown>>(
        `/api/submissions/summary?${query.toString()}`,
        { token }
      )

      return { data: [result], error: null }
    }

    if (name === "create_module_for_current_user") {
      const result = await backendRequest<{
        module_name: string
        was_created: boolean
      }>("/api/submissions/modules", {
        method: "POST",
        token,
        body: { module_name: args.p_module_name },
      })

      return { data: [result], error: null }
    }

    if (name === "delete_sst_module_for_current_user") {
      await backendRequest(
        `/api/submissions/modules/${String(args.p_module_id)}`,
        {
          method: "DELETE",
          token,
        }
      )
      return { data: [], error: null }
    }

    if (name === "set_student_module_status_for_current_user") {
      const result = await backendRequest<{ overall_rag: string }>(
        `/api/submissions/students/${encodeURIComponent(String(args.p_student_id))}/modules/${String(args.p_module_id)}`,
        {
          method: "PUT",
          token,
          body: { status: args.p_completion_status },
        }
      )

      return { data: [result], error: null }
    }

    if (name === "list_student_interventions_paginated") {
      const query = new URLSearchParams({
        limit: String(args.p_limit ?? 8),
        offset: String(args.p_offset ?? 0),
        search: String(args.p_search ?? ""),
        issue_category: String(args.p_issue_category ?? "all"),
        outcome: String(args.p_outcome ?? "all"),
      })

      const result = await backendRequest<{
        rows: Array<Record<string, unknown>>
        totalCount: number
      }>(`/api/interventions?${query.toString()}`, { token })

      const rows = result.rows.map((row) => ({
        ...row,
        total_count: result.totalCount,
      }))

      return { data: rows, error: null }
    }

    if (name === "search_students_for_intervention") {
      const query = new URLSearchParams({
        limit: String(args.p_limit ?? 30),
        search: String(args.p_search ?? ""),
      })

      const result = await backendRequest<{
        rows: Array<Record<string, unknown>>
      }>(`/api/interventions/students?${query.toString()}`, { token })

      return { data: result.rows, error: null }
    }

    if (name === "create_student_intervention") {
      await backendRequest("/api/interventions", {
        method: "POST",
        token,
        body: {
          student_id: args.p_student_id,
          interaction_type: args.p_interaction_type,
          outcome: args.p_outcome,
          issue_category: args.p_issue_category,
          notes: args.p_notes,
          action_item: args.p_action_item,
          next_planned_contact: args.p_next_planned_contact,
        },
      })

      return { data: [], error: null }
    }

    return {
      data: null,
      error: { message: `Unsupported RPC: ${name}` },
    }
  } catch (error) {
    if (error instanceof BackendRequestError && error.status === 401) {
      await clearSessionData()
    }

    return {
      data: null,
      error: mapError(error),
    }
  }
}

export async function createClient() {
  return {
    auth: {
      async getUser() {
        const session = await getSessionData()
        const user = session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
              user_metadata: {
                full_name: session.user.fullName,
                role: session.user.role,
              },
            }
          : null

        return { data: { user } }
      },
      async signInWithPassword(credentials: {
        email: string
        password: string
      }): Promise<{ error: { message: string } | null }> {
        try {
          const result = await backendRequest<{
            token: string
            user: AuthUser
          }>("/api/auth/login", {
            method: "POST",
            body: credentials,
          })
          await setSessionData({ token: result.token, user: result.user })
          return { error: null }
        } catch (error) {
          return { error: mapError(error) }
        }
      },
      async signUp(input: {
        email: string
        password: string
        options?: { data?: { full_name?: string; role?: string } }
      }): Promise<{
        data: { session: Record<string, unknown> | null }
        error: { message: string } | null
      }> {
        try {
          const result = await backendRequest<{
            token: string
            user: AuthUser
          }>("/api/auth/signup", {
            method: "POST",
            body: {
              fullName: input.options?.data?.full_name,
              role: input.options?.data?.role,
              email: input.email,
              password: input.password,
            },
          })

          await setSessionData({ token: result.token, user: result.user })

          return {
            data: { session: { access_token: result.token } },
            error: null,
          }
        } catch (error) {
          return {
            data: { session: null },
            error: mapError(error),
          }
        }
      },
      async signOut() {
        await clearSessionData()
      },
    },
    rpc: async <T>(
      name: string,
      args?: Record<string, unknown>
    ): Promise<RpcResponse<T>> => {
      const response = await runRpc(name, args)
      return response as RpcResponse<T>
    },
  }
}
