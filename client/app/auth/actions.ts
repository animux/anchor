"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/api/server"
import { loginSchema, signupSchema } from "@/lib/validations/auth"
import type { AuthActionState } from "@/app/auth/state"

export async function loginAction(
  _: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid login details",
      feedbackId: Date.now(),
    }
  }

  const apiClient = await createClient()
  const { error } = await apiClient.auth.signInWithPassword(parsed.data)

  if (error) {
    return { error: error.message, feedbackId: Date.now() }
  }

  redirect("/")
}

export async function signupAction(
  _: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid signup details",
      feedbackId: Date.now(),
    }
  }

  const { fullName, role, email, password } = parsed.data

  const apiClient = await createClient()
  const { data, error } = await apiClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  })

  if (error) {
    return { error: error.message, feedbackId: Date.now() }
  }

  if (data.session) {
    redirect("/")
  }

  return {
    success:
      "Account created. Check your email to verify your account, then sign in.",
    feedbackId: Date.now(),
  }
}

export async function signOutAction() {
  const apiClient = await createClient()
  await apiClient.auth.signOut()
  redirect("/auth/login")
}
