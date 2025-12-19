import { type NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

// Use service role to bypass RLS
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error) {
    console.error("[v0] Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Handle successful payment
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    const userId = session.metadata?.userId
    const coins = Number.parseInt(session.metadata?.coins || "0")

    if (!userId || !coins) {
      console.error("[v0] Missing metadata in session:", session.id)
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
    }

    try {
      // Fetch current balance
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from("profiles")
        .select("coins")
        .eq("id", userId)
        .single()

      if (fetchError || !profile) {
        throw new Error("Failed to fetch profile")
      }

      const newBalance = (profile.coins || 0) + coins

      // Update coins atomically
      const { error: updateError } = await supabaseAdmin.from("profiles").update({ coins: newBalance }).eq("id", userId)

      if (updateError) {
        throw new Error("Failed to update coins")
      }

      // Record transaction
      const { error: txError } = await supabaseAdmin.from("transactions").insert({
        user_id: userId,
        type: "purchase",
        amount: coins,
        balance_after: newBalance,
        description: `Stripe purchase: ${coins} coins`,
        stripe_payment_intent_id: session.payment_intent as string,
        metadata: {
          sessionId: session.id,
          amountPaid: session.amount_total,
          currency: session.currency,
        },
      })

      if (txError) {
        console.error("[v0] Failed to record transaction:", txError)
      }

      console.log(`[v0] Successfully added ${coins} coins to user ${userId}. New balance: ${newBalance}`)
    } catch (error) {
      console.error("[v0] Error processing payment:", error)
      return NextResponse.json({ error: "Failed to process payment" }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
