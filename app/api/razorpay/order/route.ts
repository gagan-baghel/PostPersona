import { NextRequest, NextResponse } from "next/server"

import { razorpay } from "@/lib/razorpay"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"

export const COIN_PACKAGES = [
  { id: "starter", coins: 50, price: 199, name: "Starter Pack" },
  { id: "pro", coins: 150, price: 499, name: "Pro Pack" },
  { id: "agency", coins: 500, price: 1499, name: "Agency Pack" },
]

export async function POST(req: NextRequest) {
  try {
    const userId = getSessionUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { packageId } = await req.json()
    const pkg = COIN_PACKAGES.find((p) => p.id === packageId)

    if (!pkg) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 })
    }

    const order = await razorpay.orders.create({
      amount: pkg.price * 100,
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${userId.slice(0, 6)}`,
      notes: {
        userId,
        packageId: pkg.id,
        coins: pkg.coins,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      packageName: pkg.name,
      packageDescription: `Purchase ${pkg.coins} coins`,
    })
  } catch (error) {
    console.error("Error creating Razorpay order:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
