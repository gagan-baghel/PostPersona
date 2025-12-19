import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { priceId, coins } = await request.json()

    // Validate input
    if (!priceId || !coins) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stripe = getStripe()

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000"}/dashboard/coins/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000"}/dashboard/coins`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        coins: coins.toString(),
      },
      ui_mode: "embedded",
    })

    return NextResponse.json({ sessionId: session.client_secret })
  } catch (error) {
    console.error("[v0] Create checkout error:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
