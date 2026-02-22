import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"

function mapPersona(persona: any) {
  return {
    id: persona._id,
    user_id: persona.user_id ?? null,
    name: persona.name,
    title: persona.title ?? null,
    personality: persona.personality,
    writing_style: persona.writing_style,
    avatar_url: persona.avatar_url ?? null,
    is_public: persona.is_public,
    is_app_provided: persona.is_app_provided,
    original_persona_id: persona.original_persona_id ?? null,
    created_at: persona.created_at,
    updated_at: persona.updated_at,
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const persona = await convexQuery<any>("app:getPersonaById", { personaId: id, userId })
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 })
    }

    return NextResponse.json(mapPersona(persona))
  } catch (error) {
    console.error("[Persona GET] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    const name = typeof body.name === "string" ? body.name.trim() : ""
    const personality = typeof body.personality === "string" ? body.personality.trim() : ""
    const writingStyle = typeof body.writing_style === "string" ? body.writing_style.trim() : ""
    const title = typeof body.title === "string" ? body.title.trim() : undefined
    const avatarUrl = typeof body.avatar_url === "string" ? body.avatar_url.trim() : undefined

    if (!name || !personality || !writingStyle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await convexMutation<any>("app:updatePersona", {
      userId,
      personaId: id,
      name,
      title: title || undefined,
      personality,
      writing_style: writingStyle,
      avatar_url: avatarUrl || undefined,
    })

    if (!result?.ok) {
      return NextResponse.json({ error: "Failed to update persona" }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Persona PATCH] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const result = await convexMutation<any>("app:deletePersona", {
      userId,
      personaId: id,
    })

    if (!result?.ok) {
      return NextResponse.json({ error: "Failed to delete persona" }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Persona DELETE] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
