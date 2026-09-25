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
import { useProfile } from "@/hooks/use-profile"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  Cpu,
  LayoutDashboard,
  Linkedin,
  LogOut,
  PenSquare,
  Search,
  Settings,
  Sparkles,
  Target,
  Zap,
} from "lucide-react"

const navGroups = [
  {
    label: null,
    items: [{ title: "Command Center", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Create",
    items: [
      { title: "Studio", href: "/dashboard/generate", icon: PenSquare },
      { title: "Growth Toolkit", href: "/dashboard/toolkit", icon: Zap },
      { title: "Personas", href: "/dashboard/personas", icon: Sparkles },
    ],
  },
  {
    label: "Publish",
    items: [
      { title: "Review Queue", href: "/dashboard/review", icon: CheckSquare },
      { title: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
      { title: "Campaigns", href: "/dashboard/campaigns", icon: Target },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Profile Analysis", href: "/dashboard/profile-analysis", icon: Search },
      { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
  {
    label: null,
    items: [{ title: "Settings", href: "/dashboard/settings", icon: Settings }],
  },
]

function ConnectionPills({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useProfile()
  const engine = profile?.ai_engines?.find((e) => e.id === profile?.ai_engine)
  const linkedInOk = profile?.linkedin_connected && !profile?.linkedin_needs_reconnect

  return (
    <Link href="/dashboard/settings" onClick={onNavigate} className="block space-y-1.5 rounded-lg border bg-background/40 p-2.5 text-xs hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Linkedin className="h-3.5 w-3.5" /> LinkedIn
        </span>
        <span className={cn("flex items-center gap-1.5 font-medium", linkedInOk ? "text-emerald-300" : "text-amber-300")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", linkedInOk ? "bg-emerald-400" : "bg-amber-400")} />
          {linkedInOk ? "Connected" : profile?.linkedin_needs_reconnect && profile?.linkedin_connected ? "Reconnect" : "Not connected"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Cpu className="h-3.5 w-3.5" /> AI engine
        </span>
        <span className={cn("flex items-center gap-1.5 font-medium", engine ? "text-emerald-300" : "text-amber-300")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", engine ? "bg-emerald-400" : "bg-amber-400")} />
          {engine ? engine.label : "None"}
        </span>
      </div>
    </Link>
  )
}

/** Sidebar body shared by the desktop rail and the mobile sheet. */
export function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      localStorage.clear()
      sessionStorage.clear()
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
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {navGroups.map((group, i) => (
          <div key={group.label ?? i} className="space-y-0.5">
            {group.label ? (
              <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">{group.label}</p>
            ) : null}
            {group.items.map((item) => {
              const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-[background-color,color,border-color]",
                    isActive
                      ? "border border-primary/40 bg-primary/20 text-primary"
                      : "border border-transparent text-muted-foreground hover:border-border hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t p-3">
        <ConnectionPills onNavigate={onNavigate} />
        <Button
          onClick={() => setShowSignOutDialog(true)}
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
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

export function NavBrand() {
  return (
    <div className="flex items-center gap-2">
      <BrandLogo size={32} className="h-8 w-8 shrink-0" />
      <div className="min-w-0 text-left">
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">LinkedIn command center</p>
        <p className="truncate text-base font-bold">PersonaPost</p>
      </div>
    </div>
  )
}

export function DashboardNav() {
  return (
    <div className="ui-glass flex h-full w-64 flex-col border-r">
      <div className="flex h-14 items-center border-b px-4">
        <NavBrand />
      </div>
      <NavBody />
    </div>
  )
}
