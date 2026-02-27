import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"
import { SavePostSchema } from "@/lib/validation/schemas"

function mapPost(post: any, persona: any) {
  return {
    ...post,
    id: post._id,
    personas: persona
      ? {
          id: persona._id,
          name: persona.name,
          title: persona.title ?? null,
          avatar_url: persona.avatar_url ?? null,
        }
      : null,
  }
}

export async function GET(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const statuses = ["review", "scheduled", "rejected", "dead_letter"]
    const posts = await convexQuery<any[]>("app:listPostsByStatus", { userId, statuses })

    const enriched = await Promise.all(
      (posts ?? []).map(async (post) => {
        const persona = post.persona_id ? await convexQuery<any>("app:getPersonaById", { personaId: post.persona_id, userId }) : null
        return mapPost(post, persona)
      }),
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("[Posts Review GET] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const validation = SavePostSchema.safeParse({
      ...body,
      workflowStatus: "review",
      targetPlatform: body.targetPlatform || "linkedin",
    })

    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
    }

    const data = validation.data
    const result = await convexMutation<any>("app:createPost", {
      userId,
      personaId: data.personaId,
      topic: data.topic,
      content: data.content,
      imageUrl: data.imageUrl || data.cloudinarySecureUrl || undefined,
      cloudinaryPublicId: data.cloudinaryPublicId || undefined,
      cloudinarySecureUrl: data.cloudinarySecureUrl || undefined,
      imagePreset: data.imagePreset || undefined,
      imagePrompt: data.imagePrompt || undefined,
      aiModelVersion: data.aiModelVersion || "gemini-2.0-flash",
      workflowStatus: "review",
      targetPlatform: data.targetPlatform || "linkedin",
    })

    if (!result?.ok) return NextResponse.json({ error: "Failed to save for review" }, { status: 400 })

    return NextResponse.json({ success: true, postId: result.postId })
  } catch (error) {
    console.error("[Posts Review POST] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
