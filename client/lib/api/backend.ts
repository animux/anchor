import { AxiosError } from "axios"

import { createBackendAxios } from "@/lib/api/axios"
import { getSessionData } from "@/lib/api/session"

type BackendRequestInit = {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  token?: string | null
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
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ??
        error.message

      throw new Error(message)
    }

    throw error
  }
}
