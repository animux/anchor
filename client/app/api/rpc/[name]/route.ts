import { NextResponse } from "next/server"

import { createClient } from "@/lib/api/server"

type RpcBody = {
  args?: Record<string, unknown>
}

export async function POST(
  request: Request,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params
  const body = (await request.json().catch(() => ({}))) as RpcBody

  const client = await createClient()
  const result = await client.rpc(name, body.args ?? {})

  const status = result.error?.code === "UNAUTHORIZED" ? 401 : 200

  return NextResponse.json(result, { status })
}
