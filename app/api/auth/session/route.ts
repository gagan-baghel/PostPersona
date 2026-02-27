import { NextResponse } from "next/server"

import { clearSessionCookie, getSessionUserIdFromRequest, getCookieValueFromHeader, SESSION_COOKIE_NAME } from "@/lib/auth/session"
import { convexQuery } from "@/lib/convex/client"

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie")
    const hasSessionCookie = Boolean(getCookieValueFromHeader(cookieHeader, SESSION_COOKIE_NAME))
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      const response = NextResponse.json({ session: null, user: null })
      if (hasSessionCookie) {
        clearSessionCookie(response)
      }
      return response
    }

    const user = await convexQuery<any>("app:getUserById", { userId })
    if (!user) {
      const response = NextResponse.json({ session: null, user: null })
      clearSessionCookie(response)
      return response
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
