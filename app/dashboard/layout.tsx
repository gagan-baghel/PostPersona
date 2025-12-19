import type React from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { DashboardNav } from "@/components/dashboard-nav"
import { Coins } from "lucide-react"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("coins").eq("id", user.id).single()

  const coins = profile?.coins || 0

  return (
    <div className="flex h-screen">
      <DashboardNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b bg-card px-6 py-3 flex items-center justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-sm">
            <Coins className="h-4 w-4 text-primary" />
            <span className="font-semibold">{coins}</span>
            <span className="text-muted-foreground">coins</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
