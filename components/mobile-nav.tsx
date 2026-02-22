"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
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
import { CalendarDays, CheckSquare, Home, LogOut, PenSquare, Settings, Sparkles } from "lucide-react"

const navItems = [
  { title: "Overview", href: "/dashboard", icon: Home },
  { title: "Studio", href: "/dashboard/generate", icon: PenSquare },
  { title: "Review Queue", href: "/dashboard/review", icon: CheckSquare },
  { title: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { title: "Personas", href: "/dashboard/personas", icon: Sparkles },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
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
      setOpen(false)
      router.replace("/auth/login")
      router.refresh()
    } catch (error) {
      console.error("Sign out error:", error)
      setIsSigningOut(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[86vw] max-w-72 p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary" />
              <div className="text-left min-w-0">
                <p className="text-xs text-muted-foreground">Workspace</p>
                <p className="text-lg font-bold truncate">PersonaPost</p>
              </div>
            </SheetTitle>
          </SheetHeader>

          <nav className="space-y-1 p-4">
            {navItems.map((item) => {
              const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors min-w-0",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{item.title}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t p-4">
            <Button
              onClick={() => {
                setOpen(false)
                setShowSignOutDialog(true)
              }}
              variant="outline"
              className="w-full justify-start gap-2 bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
