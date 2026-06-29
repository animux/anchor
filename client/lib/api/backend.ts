import { AxiosError } from "axios"

import { createBackendAxios } from "@/lib/api/axios"
import { getSessionData } from "@/lib/api/session"

type BackendRequestInit = {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  token?: string | null
}

export class BackendRequestError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = "BackendRequestError"
    this.status = status
    this.code = code
  }
}

export async function backendRequest<T>(
  path: string,
  options: BackendRequestInit = {}
): Promise<T> {
  const session = options.token ? null : await getSessionData()
  const token = options.token ?? session?.token ?? null

  try {
    const axiosClient = createBackendAxios(token)
    const response = await axiosClient.request<T>({
      url: path,
      method: options.method ?? "GET",
      data: options.body,
    })

    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status
      const responseBody = error.response?.data as
        | { message?: string; code?: string }
        | undefined
      const message = responseBody?.message ?? error.message

      throw new BackendRequestError(message, status, responseBody?.code)
    }

    throw error
  }
}
