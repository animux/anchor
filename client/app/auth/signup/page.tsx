import { redirect } from "next/navigation"

import { SignupForm } from "@/components/auth/signup-form"
import { createClient } from "@/lib/api/server"

export default async function SignupPage() {
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
        <h2 className="text-2xl font-semibold tracking-tight">
          Create Account
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose your account type and join the platform.
        </p>
      </div>
      <SignupForm />
    </div>
  )
}
