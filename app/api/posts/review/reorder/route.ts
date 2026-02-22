import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const orderedPostIds = Array.isArray(body.orderedPostIds)
      ? body.orderedPostIds.filter((id: unknown) => typeof id === "string")
      : []

    if (!orderedPostIds.length) {
      return NextResponse.json({ error: "orderedPostIds is required" }, { status: 400 })
    }

    const result = await convexMutation<any>("app:reorderScheduledQueue", { userId, orderedPostIds })
    if (!result?.ok) {
      return NextResponse.json({ error: result?.error || "Failed to reorder queue" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Posts Review Reorder] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
