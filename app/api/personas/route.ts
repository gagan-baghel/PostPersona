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
    training_posts: persona.training_posts ?? [],
    avatar_url: persona.avatar_url ?? null,
    is_public: persona.is_public,
    is_app_provided: persona.is_app_provided,
    original_persona_id: persona.original_persona_id ?? null,
    created_at: persona.created_at,
    updated_at: persona.updated_at,
  }
}

export async function GET(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const personas = await convexQuery<any[]>("app:listPersonas", { userId })
    return NextResponse.json((personas ?? []).map(mapPersona))
  } catch (error) {
    console.error("[Personas GET] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const personality = typeof body.personality === "string" ? body.personality.trim() : ""
    const writingStyle = typeof body.writing_style === "string" ? body.writing_style.trim() : ""
    const title = typeof body.title === "string" ? body.title.trim() : undefined
    const avatarUrl = typeof body.avatar_url === "string" ? body.avatar_url.trim() : undefined
    const trainingPostsRaw = Array.isArray(body.training_posts)
      ? body.training_posts.filter((p: unknown) => typeof p === "string").map((p: string) => p.trim()).filter(Boolean)
      : []

    if (!name || !personality || !writingStyle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    if (trainingPostsRaw.length > 0 && (trainingPostsRaw.length < 2 || trainingPostsRaw.length > 10)) {
      return NextResponse.json({ error: "Training posts must contain 2 to 10 posts" }, { status: 400 })
    }

    const result = await convexMutation<any>("app:createPersona", {
      userId,
      name,
      title: title || undefined,
      personality,
      writing_style: writingStyle,
      training_posts: trainingPostsRaw.length ? trainingPostsRaw : undefined,
      avatar_url: avatarUrl || undefined,
    })

    if (!result?.ok) {
      return NextResponse.json({ error: "Failed to create persona" }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: result.personaId })
  } catch (error) {
    console.error("[Personas POST] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
