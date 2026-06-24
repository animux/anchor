import { UsersIcon } from "lucide-react"

import { getAuthRoleLabel } from "@/lib/auth/roles"
import { getProfileRole } from "@/lib/api/get-profile-role"
import { createClient } from "@/lib/api/server"

type DashboardCard = {
  label: string
  value: string
  description: string
}

const adminCards: DashboardCard[] = [
  {
    label: "Total Students",
    value: "8",
    description: "Registered across all active groups",
  },
  {
    label: "Active Cohort",
    value: "2024 Autumn",
    description: "Current intake in the workspace",
  },
  {
    label: "Intake",
    value: "Sept 2024",
    description: "Latest onboarding cycle",
  },
  {
    label: "At Risk Cases",
    value: "2",
    description: "Students flagged for review",
  },
]

const sstCards: DashboardCard[] = [
  {
    label: "Assigned Students",
    value: "8",
    description: "Students in your current caseload",
  },
  {
    label: "Today's Check-ins",
    value: "3",
    description: "Students due for follow-up today",
  },
  {
    label: "Open Follow-ups",
    value: "2",
    description: "Actions awaiting completion",
  },
  {
    label: "Wellbeing Alerts",
    value: "1",
    description: "Items needing attention",
  },
]

export default async function DashboardPage() {
  const apiClient = await createClient()
  const {
    data: { user },
  } = await apiClient.auth.getUser()

  const role = await getProfileRole(apiClient, user?.user_metadata?.role)
  const cards = role === "admin" ? adminCards : sstCards
  const roleLabel = getAuthRoleLabel(role)

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-6">
      <header className="mb-6 rounded-2xl border border-border/70 bg-background p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {role === "admin" ? "Overview" : "My caseload"}
            </h1>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {roleLabel}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {role === "admin"
            ? "Manage student success data and platform-wide actions from one workspace."
            : "Focus on the students and follow-ups assigned to your account."}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => (
          <article
            key={card.label}
            className="rounded-2xl border border-border/70 bg-background p-5"
          >
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              {card.label}
            </p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-semibold">
              {index === 0 ? (
                <UsersIcon className="size-5 text-primary" />
              ) : null}
              {card.value}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {card.description}
            </p>
          </article>
        ))}
      </section>
    </div>
  )
}
