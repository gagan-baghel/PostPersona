import { NextResponse, type NextRequest } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

const DUMMY_MODE = process.env.NODE_ENV !== "production"

export async function POST(request: NextRequest) {
  if (!DUMMY_MODE) {
    return NextResponse.json({ error: "Dummy mode is disabled" }, { status: 403 })
  }

  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { coins, packageId } = await request.json()

    if (!coins || typeof coins !== "number" || coins <= 0) {
      return NextResponse.json({ error: "Invalid coins amount" }, { status: 400 })
    }

    const result = await convexMutation<any>("app:addCoins", {
      userId,
      amount: coins,
      type: "purchase",
      description: `Dummy purchase: ${packageId} package`,
      metadata: { packageId, mode: "dummy" },
    })

    if (!result?.ok) {
      return NextResponse.json({ error: "Failed to update coins" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      coinsAdded: coins,
    })
  } catch (error) {
    console.error("[Dummy Purchase] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
