'use client'

import type React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect } from "react"
import { DashboardNav } from "@/components/dashboard-nav"
import { MobileNav } from "@/components/mobile-nav"
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b bg-card px-4 md:px-6 py-3 flex items-center justify-between">
          {/* Mobile Menu */}
          <div className="md:hidden">
            <MobileNav />
          </div>

          {/* Coins Display - Clickable and Alerts when low */}
          <Link
            href="/dashboard/coins"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ml-auto transition-colors ${(coins < 10 && !coinsLoading)
              ? "bg-red-100 text-red-600 border border-red-200 animate-pulse"
              : "bg-primary/10 hover:bg-primary/20"
              }`}
          >
            <Coins className={`h-4 w-4 ${(coins < 10 && !coinsLoading) ? "text-red-500" : "text-primary"}`} />
            <span className="font-semibold">{coinsLoading ? '...' : coins}</span>
            <span className={`hidden sm:inline ${(coins < 10 && !coinsLoading) ? "text-red-500" : "text-muted-foreground"}`}>coins</span>
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
