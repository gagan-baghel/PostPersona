"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
      <div className="flex h-full w-72 flex-col border-r bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="h-8 w-8 rounded-lg bg-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Workspace</p>
            <p className="text-lg font-bold">PersonaPost</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-4">
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
