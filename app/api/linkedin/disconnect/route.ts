import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await convexMutation<any>("app:setLinkedinConnection", {
      userId,
      connected: false,
      accessToken: undefined,
      refreshToken: undefined,
      accessTokenExpiresAt: undefined,
      refreshTokenExpiresAt: undefined,
      profileId: undefined,
    })

    if (!result?.ok) {
      return NextResponse.json({ error: "Failed to disconnect LinkedIn" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[LinkedIn Disconnect] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
