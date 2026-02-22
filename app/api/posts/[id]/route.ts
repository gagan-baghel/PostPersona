import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const result = await convexMutation<any>("app:deletePost", {
      userId,
      postId: id,
    })

    if (!result?.ok) {
      return NextResponse.json({ error: "Failed to delete post" }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Posts DELETE] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
