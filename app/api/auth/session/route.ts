import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexQuery } from "@/lib/convex/client"

export async function GET(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ session: null, user: null })
    }

    const user = await convexQuery<any>("app:getUserById", { userId })
    if (!user) {
      return NextResponse.json({ session: null, user: null })
    }

    const profile = await convexQuery<any>("app:getProfile", { userId })

    return NextResponse.json({
      session: { userId },
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name ?? null,
        coins: profile?.coins ?? 0,
      },
    })
  } catch (error) {
    console.error("[Auth Session] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
