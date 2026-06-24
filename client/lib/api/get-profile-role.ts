import { getAuthRole, type AuthRole } from "@/lib/auth/roles"

export async function getProfileRole(
  _client: unknown,
  userMetadataRole?: unknown
): Promise<AuthRole> {
  return getAuthRole(userMetadataRole)
}
