import type { ReactNode } from "react"

import { ThemeToggleButton } from "@/components/auth/theme-toggle-button"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell relative min-h-svh overflow-hidden">
      <div className="auth-grid relative z-10 mx-auto flex min-h-svh w-full max-w-6xl items-center px-5 py-10 sm:px-8">
        <section className="hidden flex-1 pr-8 lg:block">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs tracking-[0.14em] text-white/75 uppercase">
              ANCHOR
            </span>
            <h1 className="max-w-xl text-5xl leading-[1.05] font-semibold text-white">
              Power your team with fast and safe access.
            </h1>
            <p className="max-w-lg text-base text-white/70">
              Sign in to continue where you left off, or create your account to
              get started in seconds.
            </p>
          </div>
        </section>

        <section className="w-full max-w-md lg:ml-auto">
          <div className="auth-card rounded-3xl border border-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Authentication
                </p>
              </div>
              <ThemeToggleButton />
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}
