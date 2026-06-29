type RpcResponse<T> = {
  data: T | null
  error: { message: string; code?: string } | null
}

function isUnauthorizedRpcResponse<T>(
  response: Response,
  payload: RpcResponse<T>
) {
  if (response.status === 401) {
    return true
  }

  const errorMessage = payload.error?.message?.toLowerCase() ?? ""
  return (
    payload.error?.code === "UNAUTHORIZED" ||
    errorMessage === "unauthorized" ||
    errorMessage.includes("session expired")
  )
}

function redirectToLogin() {
  if (typeof window === "undefined") {
    return
  }

  window.location.replace("/auth/login?reason=session_expired")
}

export function createClient() {
  return {
    rpc: async <T>(
      name: string,
      args?: Record<string, unknown>
    ): Promise<RpcResponse<T>> => {
      const response = await fetch(`/api/rpc/${encodeURIComponent(name)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ args: args ?? {} }),
      })

      const payload = (await response.json()) as RpcResponse<T>

      if (isUnauthorizedRpcResponse(response, payload)) {
        redirectToLogin()
        return {
          data: null,
          error: {
            message: "Session expired. Please sign in again.",
            code: "UNAUTHORIZED",
          },
        }
      }

      return payload
    },
  }
}
