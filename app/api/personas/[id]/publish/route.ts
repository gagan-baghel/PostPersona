import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const isPublic = Boolean(body?.isPublic)

    const { id } = await context.params
    const result = await convexMutation<any>("app:setPersonaVisibility", {
      userId,
      personaId: id,
      isPublic,
    })

    if (!result?.ok) {
      const status = result?.error === "CLONED_CANNOT_PUBLISH" ? 400 : 403
      return NextResponse.json({ error: "Failed to update visibility" }, { status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Persona Publish] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
