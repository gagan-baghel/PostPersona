import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexQuery } from "@/lib/convex/client"

export async function GET(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await convexQuery<any>("app:getProfile", { userId })
    return NextResponse.json({ coins: profile?.coins ?? 0 })
  } catch (error) {
    console.error("[Coins GET] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
