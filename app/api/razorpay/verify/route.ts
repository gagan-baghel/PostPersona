import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

import { convexMutation, convexQuery } from "@/lib/convex/client"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"

const COIN_PACKAGES = [
  { id: "starter", coins: 50, price: 199 },
  { id: "pro", coins: 150, price: 499 },
  { id: "agency", coins: 500, price: 1499 },
]

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId } = await req.json()

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 })
    }

    const userId = getSessionUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pkg = COIN_PACKAGES.find((p) => p.id === packageId)
    if (!pkg) {
      return NextResponse.json({ error: "Invalid package reference" }, { status: 400 })
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const existing = await convexQuery<any>("app:findTransactionByPaymentId", {
      paymentId: razorpay_payment_id,
    })

    if (existing) {
      return NextResponse.json({ success: true, new_balance: existing.balance_after, duplicate: true })
    }

    const credit = await convexMutation<any>("app:addCoins", {
      userId,
      amount: pkg.coins,
      type: "purchase",
      description: `Purchased ${pkg.coins} coins (Razorpay: ${razorpay_payment_id})`,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      metadata: { packageId },
    })

    if (!credit?.ok) {
      return NextResponse.json({ error: "Failed to credit coins" }, { status: 500 })
    }

    return NextResponse.json({ success: true, new_balance: credit.newBalance, duplicate: false })
  } catch (error) {
    console.error("Error verifying payment:", error)
    return NextResponse.json({ error: "Internal payment verification failed" }, { status: 500 })
  }
}
