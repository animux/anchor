"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AnchorIcon,
  BarChart3Icon,
  BriefcaseBusinessIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  MessageCircleIcon,
  SproutIcon,
  UserCircle2Icon,
  UsersIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getAuthRoleLabel, type AuthRole } from "@/lib/auth/roles"

type DashboardLayoutShellProps = {
  name: string
  email: string
  role: AuthRole
  signOutSlot?: React.ReactNode
  children: React.ReactNode
}

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboardIcon },
  { label: "All students", href: "/all-students", icon: UsersIcon },
  {
    label: "Student records",
    href: "/student-records",
    icon: ClipboardListIcon,
  },
  { label: "Submissions", href: "/submissions", icon: BarChart3Icon },
  {
    label: "Wellbeing Centre",
    href: "/wellbeing-centre",
    icon: SproutIcon,
  },
  {
    label: "Work board",
    href: "/work-board",
    icon: BriefcaseBusinessIcon,
    badge: "2",
  },
  {
    label: "Group messaging",
    href: "/group-messaging",
    icon: MessageCircleIcon,
  },
  { label: "My account", href: "/my-account", icon: UserCircle2Icon },
]

export function DashboardLayoutShell({
  name,
  email,
  role,
  signOutSlot,
  children,
}: DashboardLayoutShellProps) {
  const pathname = usePathname()
  const roleLabel = getAuthRoleLabel(role)

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-linear-to-br from-background via-muted/25 to-primary/10">
        <Sidebar
          collapsible="icon"
          className="border-r border-primary/20 bg-linear-to-b from-sidebar via-sidebar to-primary/12"
        >
          <SidebarHeader className="py-4">
            <div className="relative flex items-center gap-2 overflow-hidden rounded-2xl border border-primary/25 bg-sidebar/70 px-2 py-2 shadow-[0_16px_40px_-28px_var(--primary)]">
              <span
                aria-hidden
                className="pointer-events-none absolute -top-8 -right-8 size-20 rounded-full bg-primary/20 blur-2xl"
              />
              <span className="grid size-8 place-items-center rounded-xl border border-primary/25 bg-primary/15 text-primary shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary),white_65%)]">
                <AnchorIcon className="size-4" />
              </span>
              <span className="text-lg font-semibold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                Anchor
              </span>
              <span className="ml-auto size-2 rounded-full bg-primary shadow-[0_0_14px_var(--primary)] group-data-[collapsible=icon]:hidden" />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const active = pathname === item.href

                    return (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                          className="rounded-xl border border-transparent text-sidebar-foreground/85 transition-all hover:border-primary/20 hover:bg-primary/12 hover:text-primary data-[active=true]:border-primary/30 data-[active=true]:bg-primary/18 data-[active=true]:text-primary data-[active=true]:shadow-[0_10px_30px_-18px_var(--primary)] dark:hover:bg-primary/16 dark:hover:text-sidebar-foreground dark:data-[active=true]:border-primary/50 dark:data-[active=true]:bg-primary dark:data-[active=true]:text-primary-foreground"
                        >
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {item.badge ? (
                          <SidebarMenuBadge className="right-2 rounded-full bg-primary/90 px-1.5 text-[10px] text-primary-foreground shadow-[0_0_14px_color-mix(in_oklch,var(--primary),white_25%)]">
                            {item.badge}
                          </SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 shadow-[0_14px_36px_-24px_var(--primary)] group-data-[collapsible=icon]:hidden">
              <p className="text-sm leading-tight font-medium">{name}</p>
              <p className="mt-1 truncate text-xs text-sidebar-foreground/70">
                {email}
              </p>
              <div className="mt-3">{signOutSlot}</div>
            </div>
            <div className="hidden rounded-xl border border-primary/20 bg-primary/10 p-2 group-data-[collapsible=icon]:block">
              {signOutSlot}
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-h-svh rounded-none bg-transparent shadow-none">
          <header className="flex h-14 items-center gap-2 border-b border-border/70 px-4">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">
              Student Success Platform
            </span>
            <span className="ml-auto rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.18em] text-primary uppercase">
              {roleLabel}
            </span>
          </header>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
