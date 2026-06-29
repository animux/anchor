import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_AUTH_PREFIX = "/auth"
const TOKEN_COOKIE = "ssp_access_token"
const USER_COOKIE = "ssp_user"

function getTokenExpiryMs(token: string): number | null {
  const parts = token.split(".")
  if (parts.length < 2) {
    return null
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
    const payload = JSON.parse(atob(padded)) as { exp?: number }

    if (typeof payload.exp !== "number") {
      return null
    }

    return payload.exp * 1000
  } catch {
    return null
  }
}

function isTokenExpired(token: string) {
  const expiryMs = getTokenExpiryMs(token)
  return expiryMs !== null && expiryMs <= Date.now()
}

export async function updateSession(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value
  const { pathname } = request.nextUrl
  const hasExpiredToken = token ? isTokenExpired(token) : false
  const hasUsableToken = Boolean(token) && !hasExpiredToken

  if (!hasUsableToken && !pathname.startsWith(PUBLIC_AUTH_PREFIX)) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    if (hasExpiredToken) {
      url.searchParams.set("reason", "session_expired")
    }
    const response = NextResponse.redirect(url)

    if (hasExpiredToken) {
      response.cookies.delete(TOKEN_COOKIE)
      response.cookies.delete(USER_COOKIE)
    }

    return response
  }

  if (hasUsableToken && pathname.startsWith(PUBLIC_AUTH_PREFIX)) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  if (hasExpiredToken) {
    const response = NextResponse.next({ request })
    response.cookies.delete(TOKEN_COOKIE)
    response.cookies.delete(USER_COOKIE)
    return response
  }

  return NextResponse.next({ request })
}
