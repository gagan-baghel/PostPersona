import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexQuery } from "@/lib/convex/client"

export async function GET(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = Number(url.searchParams.get("page") || "1")
    const pageSizeParam = Number(url.searchParams.get("pageSize") || "20")
    const pageSize = Number.isNaN(pageSizeParam) || pageSizeParam < 1 ? 20 : Math.min(pageSizeParam, 250)
    const statusesParam = url.searchParams.get("statuses")
    const statuses = statusesParam
      ? Array.from(
          new Set(
            statusesParam
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        )
      : []

    const posts =
      statuses.length > 0
        ? await convexQuery<any[]>("app:listPostsByStatus", { userId, statuses })
        : await convexQuery<any[]>("app:listPosts", {
            userId,
            page: Number.isNaN(page) || page < 1 ? 1 : page,
            pageSize,
          })

    return NextResponse.json(posts ?? [])
  } catch (error) {
    console.error("[Posts GET] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
