import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Coins } from "lucide-react"
import Link from "next/link"

export default async function SuccessPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("coins").eq("id", user.id).single()

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-500/20 p-3">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground">Your coins have been added to your account</p>
        </div>

        <div className="flex items-center justify-center gap-2 p-4 bg-primary/10 rounded-lg">
          <Coins className="h-6 w-6 text-primary" />
          <span className="text-2xl font-bold">{profile?.coins || 0}</span>
          <span className="text-muted-foreground">coins</span>
        </div>

        <div className="flex gap-3">
          <Button asChild variant="outline" className="flex-1 bg-transparent">
            <Link href="/dashboard/coins">Buy More</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/dashboard/generate">Generate Posts</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
