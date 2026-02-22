import { NextResponse } from "next/server"

import { SavePostSchema } from "@/lib/validation/schemas"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const validation = SavePostSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.format(),
        },
        { status: 400 },
      )
    }

    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      personaId,
      topic,
      content,
      imageUrl,
      cloudinaryPublicId,
      cloudinarySecureUrl,
      imagePreset,
      imagePrompt,
      aiModelVersion,
    } = validation.data

    const result = await convexMutation<any>("app:createPost", {
      userId,
      personaId,
      topic,
      content,
      imageUrl: imageUrl || cloudinarySecureUrl || undefined,
      cloudinaryPublicId: cloudinaryPublicId || undefined,
      cloudinarySecureUrl: cloudinarySecureUrl || undefined,
      imagePreset: imagePreset || undefined,
      imagePrompt: imagePrompt || undefined,
      aiModelVersion: aiModelVersion || "DeepSeek-V3.1-Nex-N1",
    })

    if (!result?.ok) {
      return NextResponse.json({ error: "Database transaction failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true, postId: result.postId })
  } catch (error) {
    console.error("[Save-Post API] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
