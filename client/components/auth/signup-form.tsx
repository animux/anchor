"use client"

import Link from "next/link"
import { useActionState, useEffect } from "react"
import { toast } from "sonner"

import { signupAction } from "@/app/auth/actions"
import { initialAuthState, type AuthActionState } from "@/app/auth/state"
import { AuthSubmitButton } from "@/components/auth/auth-submit-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { authRoleOptions } from "@/lib/auth/roles"

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

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initialAuthState)

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
        <label htmlFor="fullName" className="text-sm text-muted-foreground">
          Full name
        </label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          placeholder="Jane Doe"
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="role" className="text-sm text-muted-foreground">
          Account type
        </label>
        <Select name="role" defaultValue="sst">
          <SelectTrigger id="role" className="h-10 w-full rounded-2xl">
            <SelectValue placeholder="Choose an account type" />
          </SelectTrigger>
          <SelectContent>
            {authRoleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span>{option.label}</span>
                <span className="text-muted-foreground">
                  {option.description}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="text-sm text-muted-foreground"
        >
          Confirm password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Repeat password"
          className="h-10"
        />
      </div>

      <Message state={state} />

      <AuthSubmitButton pendingText="Creating account...">
        Create Account
      </AuthSubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
