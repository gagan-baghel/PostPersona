import { NextResponse } from "next/server"
import openrouter, { AI_MODELS } from "@/lib/ai/openrouter"
import { buildStructuredPrompt } from "@/lib/ai/prompt-builder"
import { GeneratePostSchema } from "@/lib/validation/schemas"
import { z } from "zod"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = GeneratePostSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.format() }, { status: 400 })
    }

    const { avatarId, topic } = validation.data
    const userId = getSessionUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await convexQuery<any>("app:getProfile", { userId })
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (profile.coins < 3) {
      return NextResponse.json({ error: "Insufficient coins. Please purchase more." }, { status: 402 })
    }

    const persona = await convexQuery<any>("app:getPersonaById", { personaId: avatarId, userId })
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 })
    }

    const messages = buildStructuredPrompt(persona, topic)

    const completion = await openrouter.chat.send({
      model: AI_MODELS.TEXT_GENERATION,
      messages: messages as any,
      // @ts-ignore OpenRouter SDK typing mismatch
      temperature: 0.7,
      maxTokens: 1000,
      stream: false,
    })

    const resultRaw = (completion as any).choices?.[0]?.message?.content || ""
    let resultJson

    const AIOutputSchema = z.object({
      content: z.string().min(10, "Generated content too short"),
      hashtags: z.array(z.string()).optional(),
    })

    try {
      const parsedRaw = JSON.parse(resultRaw || "{}")
      const validated = AIOutputSchema.safeParse(parsedRaw)

      if (validated.success) {
        resultJson = validated.data
      } else if (typeof parsedRaw.content === "string") {
        resultJson = { content: parsedRaw.content, hashtags: [] }
      } else {
        throw new Error("Invalid schema")
      }
    } catch {
      const match = resultRaw?.match(/```json\n([\s\S]*?)\n```/)
      if (match && match[1]) {
        try {
          const innerJson = JSON.parse(match[1])
          const validated = AIOutputSchema.safeParse(innerJson)
          if (validated.success) {
            resultJson = validated.data
          } else {
            throw new Error("Invalid inner schema")
          }
        } catch {
          return NextResponse.json({ error: "AI generation failed output format. Please try again." }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: "AI generation malfunction" }, { status: 500 })
      }
    }

    const deduction = await convexMutation<any>("app:addCoins", {
      userId,
      amount: -3,
      type: "post_generation",
      description: `Generated post as ${persona.name}`,
    })

    if (!deduction?.ok) {
      return NextResponse.json({ error: "Transaction failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: resultJson,
      remainingCoins: deduction.newBalance,
    })
  } catch (error) {
    console.error("[Generate API] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
