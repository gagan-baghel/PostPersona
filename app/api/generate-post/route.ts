import { NextResponse } from "next/server"
import { z } from "zod"

import { buildStructuredPrompt } from "@/lib/ai/prompt-builder"
import { AIOutputFormatError, creditCost, generateText, mapAIError, parseJsonLoose, resolveEngine } from "@/lib/ai/llm"
import { GeneratePostSchema } from "@/lib/validation/schemas"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"
import { CREDIT_COSTS } from "@/lib/pricing"

const AIOutputSchema = z.object({
  content: z.string().min(10, "Generated content too short"),
  hashtags: z.array(z.string()).optional(),
})

function extractHashtagsFromText(text: string) {
  const tags = Array.from(new Set((text.match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.trim())))
  return tags.slice(0, 8)
}

function normalizeRawToContent(raw: string) {
  let text = raw || ""
  text = text.replace(/```json/gi, "").replace(/```/g, "")
  text = text.replace(/^([\s\S]*?)"content"\s*:\s*/i, "")
  text = text.replace(/\s+/g, " ").trim()
  if (text.length > 1200) text = `${text.slice(0, 1199)}…`
  return text
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = GeneratePostSchema.safeParse(body)

    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || "Invalid input"
      return NextResponse.json({ error: firstIssue, details: validation.error.format() }, { status: 400 })
    }

    const { avatarId, topic, targetPlatform } = validation.data
    const userId = getSessionUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [profile, persona] = await Promise.all([
      convexQuery<any>("app:getProfile", { userId }),
      convexQuery<any>("app:getPersonaById", { personaId: avatarId, userId }),
    ])

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    if (!persona) return NextResponse.json({ error: "Persona not found" }, { status: 404 })

    const engine = resolveEngine(profile.ai_provider)
    const cost = creditCost(engine, CREDIT_COSTS.post)
    if (profile.coins < cost) {
      return NextResponse.json({ error: "Insufficient coins. Please purchase more." }, { status: 402 })
    }

    const messages = buildStructuredPrompt(persona, topic, targetPlatform)
    const generation = await generateText({
      messages,
      temperature: 0.35,
      maxTokens: 520,
      engine,
    })
    const resultRaw = generation.text

    let resultJson: { content: string; hashtags?: string[] }
    try {
      const parsedRaw = parseJsonLoose(resultRaw)
      const validated = AIOutputSchema.safeParse(parsedRaw)
      if (!validated.success) {
        if (typeof parsedRaw?.content !== "string") {
          throw new AIOutputFormatError("AI generation failed output schema")
        }
        resultJson = { content: parsedRaw.content, hashtags: [] }
      } else {
        resultJson = validated.data
      }
    } catch (formatError) {
      const fallbackContent = normalizeRawToContent(resultRaw)
      if (fallbackContent.length < 20) {
        throw formatError
      }
      resultJson = {
        content: fallbackContent,
        hashtags: extractHashtagsFromText(fallbackContent),
      }
    }

    const deduction = cost
      ? await convexMutation<any>("app:addCoins", {
          userId,
          amount: -cost,
          type: "post_generation",
          description: `Generated post as ${persona.name}`,
        })
      : { ok: true, newBalance: profile.coins }

    if (!deduction?.ok) {
      return NextResponse.json({ error: "Transaction failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: resultJson,
      remainingCoins: deduction.newBalance,
      model: generation.model,
      engine: generation.engine,
    })
  } catch (error: any) {
    console.error("[Generate API] Error:", error)
    const mapped = mapAIError(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}
