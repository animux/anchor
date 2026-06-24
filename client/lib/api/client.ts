type RpcResponse<T> = {
  data: T | null
  error: { message: string; code?: string } | null
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
      return payload
    },
  }
}
