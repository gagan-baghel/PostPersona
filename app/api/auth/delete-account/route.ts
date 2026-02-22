import { NextResponse } from "next/server"

import { clearSessionCookie, getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

export async function DELETE(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await convexMutation<any>("app:deleteUserAccount", { userId })
    if (!result?.ok) {
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
    }

    const response = NextResponse.json({ success: true })
    clearSessionCookie(response)
    return response
  } catch (error) {
    console.error("[Delete Account] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
