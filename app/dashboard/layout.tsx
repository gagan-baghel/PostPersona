'use client'

import type React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect } from "react"
import { DashboardNav } from "@/components/dashboard-nav"
import { MobileNav } from "@/components/mobile-nav"
import { ReadinessIndicator } from "@/components/dashboard/readiness-indicator"
import { Coins } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useCoins } from "@/hooks/use-coins"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { coins, isLoading: coinsLoading } = useCoins()

  // Redirect to login if not authenticated (after loading)
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!authLoading && user) {
      fetch("/api/posts/process-queue", { method: "POST" }).catch(() => undefined)
    }
  }, [authLoading, user])

  // Show nothing while checking auth (instant mount, no blocking)
  if (authLoading) {
    return null
  }

  // If no user, return null (useEffect will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <DashboardNav />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="ui-glass border-b px-2 sm:px-3 md:px-5 py-2.5 flex items-center justify-between gap-2 min-w-0">
          {/* Mobile Menu */}
          <div className="md:hidden">
            <MobileNav />
          </div>

          {/* Coins Display - Clickable and Alerts when low */}
          <div className="ml-auto flex items-center gap-2">
            <ReadinessIndicator />
            <Link
              href="/dashboard/coins"
              className={`flex max-w-[58vw] sm:max-w-none items-center gap-1.5 px-2.5 py-1 rounded-md text-xs sm:text-sm transition-colors ${(coins < 10 && !coinsLoading)
                ? "border border-destructive/40 bg-destructive/15 text-destructive status-pulse"
                : "border border-primary/30 bg-primary/12 hover:bg-primary/20"
                }`}
            >
              <Coins className={`h-4 w-4 ${(coins < 10 && !coinsLoading) ? "text-red-500" : "text-primary"}`} />
              <span className="metric-mono font-semibold truncate">{coinsLoading ? '...' : coins}</span>
              <span className={`hidden sm:inline ${(coins < 10 && !coinsLoading) ? "text-red-500" : "text-muted-foreground"}`}>coins</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 min-w-0">{children}</main>
      </div>
    </div>
  )
}
