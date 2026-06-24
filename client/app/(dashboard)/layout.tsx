import { redirect } from "next/navigation"

import { signOutAction } from "@/app/auth/actions"
import { DashboardLayoutShell } from "@/components/dashboard/dashboard-layout-shell"
import { Button } from "@/components/ui/button"
import { getProfileRole } from "@/lib/api/get-profile-role"
import { createClient } from "@/lib/api/server"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const apiClient = await createClient()
  const {
    data: { user },
  } = await apiClient.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const role = await getProfileRole(apiClient, user.user_metadata?.role)

  return (
    <DashboardLayoutShell
      name={user?.user_metadata?.full_name ?? "Student Success Tutor"}
      email={user.email ?? "admin@anchor.edu"}
      role={role}
      signOutSlot={
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Sign Out
          </Button>
        </form>
      }
    >
      {children}
    </DashboardLayoutShell>
  )
}
