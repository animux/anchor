import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { createClient } from "@/lib/api/server"

type LoginPageProps = {
  searchParams?: Promise<{ reason?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const apiClient = await createClient()
  const {
    data: { user },
  } = await apiClient.auth.getUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const showSessionExpiredMessage =
    resolvedSearchParams?.reason === "session_expired"

  if (user) {
    redirect("/")
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome Back</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to access your dashboard.
        </p>
      </div>
      <LoginForm showSessionExpiredMessage={showSessionExpiredMessage} />
    </div>
  )
}
