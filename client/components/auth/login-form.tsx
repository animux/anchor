"use client"

import Link from "next/link"
import { useActionState, useEffect } from "react"
import { toast } from "sonner"

import { loginAction } from "@/app/auth/actions"
import { initialAuthState, type AuthActionState } from "@/app/auth/state"
import { AuthSubmitButton } from "@/components/auth/auth-submit-button"
import { Input } from "@/components/ui/input"

function Message({ state }: { state: AuthActionState }) {
  if (!state.error && !state.success) {
    return null
  }

  const isError = Boolean(state.error)

  return (
    <p
      className={
        isError ? "text-sm text-destructive" : "text-sm text-emerald-600"
      }
      role="status"
      aria-live="polite"
    >
      {state.error ?? state.success}
    </p>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialAuthState)

  useEffect(() => {
    if (!state.feedbackId) {
      return
    }

    if (state.error) {
      toast.error(state.error)
      return
    }

    if (state.success) {
      toast.success(state.success)
    }
  }, [state.feedbackId, state.error, state.success])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm text-muted-foreground">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm text-muted-foreground">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Your password"
          className="h-10"
        />
      </div>

      <Message state={state} />

      <AuthSubmitButton pendingText="Signing in...">Sign In</AuthSubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/auth/signup"
          className="font-medium text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  )
}
