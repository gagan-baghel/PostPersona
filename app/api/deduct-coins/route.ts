import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { amount, transaction_type, description } = await request.json()

    if (!amount || amount <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 })
    }

    if (!transaction_type) {
      return Response.json({ error: "Transaction type is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("coins")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("[v0] Profile not found:", profileError)
      return Response.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check if user has enough coins
    if (profile.coins < amount) {
      return Response.json(
        { error: `Insufficient coins. You have ${profile.coins} coins but need ${amount}.` },
        { status: 400 },
      )
    }

    const newBalance = profile.coins - amount
    const { error: updateError } = await supabase.from("profiles").update({ coins: newBalance }).eq("id", user.id)

    if (updateError) {
      console.error("[v0] Failed to deduct coins:", updateError)
      return Response.json({ error: "Failed to deduct coins: " + updateError.message }, { status: 500 })
    }

    const { error: transactionError } = await supabase.from("coin_transactions").insert({
      user_id: user.id,
      amount: -amount,
      transaction_type,
      description: description || `Deducted ${amount} coins for ${transaction_type}`,
    })

    if (transactionError) {
      console.error("[v0] Failed to record transaction:", transactionError)
      // Continue anyway - the deduction already happened
    }

    return Response.json({ success: true, newBalance })
  } catch (error) {
    console.error("[v0] Error in deduct-coins:", error)
    return Response.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    )
  }
}
