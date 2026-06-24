import { cookies } from "next/headers"

type SessionUser = {
  id: string
  fullName: string
  email: string
  role: "admin" | "sst"
}

type SessionData = {
  token: string
  user: SessionUser
}

const TOKEN_COOKIE = "ssp_access_token"
const USER_COOKIE = "ssp_user"

export async function getSessionData(): Promise<SessionData | null> {
  const store = await cookies()
  const token = store.get(TOKEN_COOKIE)?.value
  const userValue = store.get(USER_COOKIE)?.value

  if (!token || !userValue) {
    return null
  }

  try {
    const parsed = JSON.parse(userValue) as SessionUser
    if (!parsed?.id || !parsed?.email || !parsed?.role) {
      return null
    }

    return {
      token,
      user: parsed,
    }
  } catch {
    return null
  }
}

export async function setSessionData(input: SessionData) {
  const store = await cookies()

  store.set(TOKEN_COOKIE, input.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  store.set(USER_COOKIE, JSON.stringify(input.user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearSessionData() {
  const store = await cookies()
  store.delete(TOKEN_COOKIE)
  store.delete(USER_COOKIE)
}
