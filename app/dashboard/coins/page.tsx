import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { CoinPurchaseClient } from "@/components/coin-purchase-client"

export default async function CoinsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch current coin balance
  const { data: profile } = await supabase.from("profiles").select("coins").eq("id", user.id).single()

  const currentCoins = profile?.coins || 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Buy Coins</h1>
        <p className="text-muted-foreground mt-2">Purchase coins to generate posts and images</p>
      </div>

      <CoinPurchaseClient currentCoins={currentCoins} userEmail={user.email || ""} />
    </div>
  )
}
