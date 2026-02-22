import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { amount, transaction_type, description } = await request.json()

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const result = await convexMutation<any>("app:addCoins", {
      userId,
      amount: -Math.abs(amount),
      type: transaction_type || "deduction",
      description: description || `Deducted ${amount} coins`,
    })

    if (!result?.ok) {
      const status = result?.error === "INSUFFICIENT_COINS" ? 400 : 500
      return NextResponse.json({ error: result?.error || "Failed to deduct coins" }, { status })
    }

    return NextResponse.json({ success: true, newBalance: result.newBalance })
  } catch (error) {
    console.error("[Deduct Coins] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
