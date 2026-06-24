export const authRoles = ["admin", "sst"] as const

export type AuthRole = (typeof authRoles)[number]

const authRoleLabels: Record<AuthRole, string> = {
  admin: "Admin",
  sst: "SST",
}

const authRoleDescriptions: Record<AuthRole, string> = {
  admin: "Full platform access",
  sst: "Tutor access",
}

export type AuthRoleOption = {
  value: AuthRole
  label: string
  description: string
}

export const authRoleOptions: AuthRoleOption[] = authRoles.map((role) => ({
  value: role,
  label: authRoleLabels[role],
  description: authRoleDescriptions[role],
}))

export function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === "string" && authRoles.includes(value as AuthRole)
}

export function getAuthRole(value: unknown): AuthRole {
  return isAuthRole(value) ? value : "sst"
}

export function getAuthRoleLabel(role: AuthRole) {
  return authRoleLabels[role]
}
