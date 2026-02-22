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

    const posts = await convexQuery<any[]>("app:listPosts", {
      userId,
      page: Number.isNaN(page) || page < 1 ? 1 : page,
      pageSize: 20,
    })

    return NextResponse.json(posts ?? [])
  } catch (error) {
    console.error("[Posts GET] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
