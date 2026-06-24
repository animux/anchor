import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { createClient } from "@/lib/api/server"

export default async function LoginPage() {
  const apiClient = await createClient()
  const {
    data: { user },
  } = await apiClient.auth.getUser()

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
      <LoginForm />
    </div>
  )
}
