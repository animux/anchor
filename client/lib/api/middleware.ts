import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_AUTH_PREFIX = "/auth"

export async function updateSession(request: NextRequest) {
  const token = request.cookies.get("ssp_access_token")?.value
  const { pathname } = request.nextUrl

  if (!token && !pathname.startsWith(PUBLIC_AUTH_PREFIX)) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  if (token && pathname.startsWith(PUBLIC_AUTH_PREFIX)) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}
