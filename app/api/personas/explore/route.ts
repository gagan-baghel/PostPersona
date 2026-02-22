import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexQuery } from "@/lib/convex/client"

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

export async function GET(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const personas = await convexQuery<any[]>("app:listExplorePersonas", { userId })
    return NextResponse.json((personas ?? []).map(mapPersona))
  } catch (error) {
    console.error("[Explore Personas GET] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
