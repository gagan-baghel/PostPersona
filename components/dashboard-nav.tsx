"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/brand-logo"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { BarChart3, CalendarDays, CheckSquare, Home, LogOut, PenSquare, Search, Settings, Sparkles, Target } from "lucide-react"

const navItems = [
  { title: "Overview", href: "/dashboard", icon: Home },
  { title: "Studio", href: "/dashboard/generate", icon: PenSquare },
  { title: "Review Queue", href: "/dashboard/review", icon: CheckSquare },
  { title: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { title: "Campaigns", href: "/dashboard/campaigns", icon: Target },
  { title: "Profile Analysis", href: "/dashboard/profile-analysis", icon: Search },
  { title: "Advanced Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { title: "Personas", href: "/dashboard/personas", icon: Sparkles },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      if (typeof window !== "undefined") {
        localStorage.clear()
        sessionStorage.clear()
      }
      setShowSignOutDialog(false)
      router.replace("/auth/login")
      router.refresh()
    } catch (error) {
      console.error("Sign out error:", error)
      setIsSigningOut(false)
    }
  }

  return (
    <>
      <div className="ui-glass flex h-full w-72 flex-col border-r">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <BrandLogo size={32} className="h-8 w-8" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Workspace</p>
            <p className="text-lg font-bold">PersonaPost</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-[background-color,color,border-color]",
                  isActive
                    ? "border border-primary/40 bg-primary/20 text-primary"
                    : "border border-transparent text-muted-foreground hover:border-border hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-3">
          <Button onClick={() => setShowSignOutDialog(true)} variant="outline" className="w-full justify-start gap-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSigningOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSigningOut ? "Signing Out..." : "Sign Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
