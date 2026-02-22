import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const result = await convexMutation<any>("app:clonePersona", {
      userId,
      personaId: id,
    })

    if (!result?.ok) {
      if (result?.error === "ALREADY_CLONED") {
        return NextResponse.json({ error: "Persona already cloned" }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to clone persona" }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: result.personaId })
  } catch (error) {
    console.error("[Persona Clone] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
