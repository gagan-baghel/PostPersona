import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await context.params
    const body = await request.json()
    const action = typeof body.action === "string" ? body.action : ""

    if (action === "approve") {
      const result = await convexMutation<any>("app:approvePostAndAutoSchedule", { userId, postId: id })
      if (!result?.ok) return NextResponse.json({ error: "Failed to approve post" }, { status: 400 })
      return NextResponse.json({ success: true, status: "scheduled", scheduledFor: result.scheduledFor })
    }

    if (action === "reject") {
      const result = await convexMutation<any>("app:setPostWorkflow", {
        userId,
        postId: id,
        status: "rejected",
        reviewNotes: typeof body.reviewNotes === "string" ? body.reviewNotes : undefined,
      })
      if (!result?.ok) return NextResponse.json({ error: "Failed to reject post" }, { status: 400 })
      return NextResponse.json({ success: true, status: "rejected" })
    }

    if (action === "reschedule") {
      const scheduledFor = Number(body.scheduledFor)
      if (!Number.isFinite(scheduledFor)) {
        return NextResponse.json({ error: "Invalid scheduledFor timestamp" }, { status: 400 })
      }

      const result = await convexMutation<any>("app:setPostWorkflow", {
        userId,
        postId: id,
        status: "scheduled",
        scheduledFor,
      })
      if (!result?.ok) return NextResponse.json({ error: "Failed to reschedule post" }, { status: 400 })
      return NextResponse.json({ success: true, status: "scheduled", scheduledFor })
    }

    if (action === "replay") {
      const result = await convexMutation<any>("app:replayDeadLetterPost", { userId, postId: id })
      if (!result?.ok) return NextResponse.json({ error: "Failed to replay post" }, { status: 400 })
      return NextResponse.json({ success: true, status: "scheduled", scheduledFor: result.scheduledFor ?? null })
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (error) {
    console.error("[Posts Review PATCH] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
