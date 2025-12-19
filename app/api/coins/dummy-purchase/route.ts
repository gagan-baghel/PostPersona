import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// SECURITY: This endpoint should be disabled in production
// Set DUMMY_MODE to false in production environments
const DUMMY_MODE = true

export async function POST(request: NextRequest) {
  if (!DUMMY_MODE) {
    return NextResponse.json({ error: "Dummy mode is disabled" }, { status: 403 })
  }

  try {
    const supabase = await createServerClient()
    const { coins, packageId } = await request.json()

    // Validate input
    if (!coins || typeof coins !== "number" || coins <= 0) {
      return NextResponse.json({ error: "Invalid coins amount" }, { status: 400 })
    }

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch current balance
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("coins")
      .eq("id", user.id)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    const newBalance = (profile.coins || 0) + coins

    // Update coins atomically
    const { error: updateError } = await supabase.from("profiles").update({ coins: newBalance }).eq("id", user.id)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update coins" }, { status: 500 })
    }

    // Record transaction
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "purchase",
      amount: coins,
      balance_after: newBalance,
      description: `Dummy purchase: ${packageId} package`,
      metadata: { packageId, mode: "dummy" },
    })

    if (txError) {
      console.error("[v0] Failed to record transaction:", txError)
    }

    return NextResponse.json({
      success: true,
      newBalance,
      coinsAdded: coins,
    })
  } catch (error) {
    console.error("[v0] Dummy purchase error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
