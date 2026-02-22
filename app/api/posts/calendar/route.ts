import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexQuery } from "@/lib/convex/client"

export async function GET(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const posts = await convexQuery<any[]>("app:listPostsByStatus", {
      userId,
      statuses: ["scheduled", "posted"],
    })

    const safe = (posts ?? [])
      .filter((post) => {
        const status = post.workflow_status ?? "draft"
        return status === "scheduled" || status === "posted"
      })
      .map((post) => ({
        ...post,
        id: String(post._id ?? post.id ?? ""),
      }))

    return NextResponse.json(safe, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("[Posts Calendar GET] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
