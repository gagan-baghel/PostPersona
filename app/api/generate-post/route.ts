import { NextResponse } from "next/server"
import { z } from "zod"

import { buildStructuredPrompt } from "@/lib/ai/prompt-builder"
import { generateWithGrok } from "@/lib/ai/grok"
import { GeneratePostSchema } from "@/lib/validation/schemas"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"

const AIOutputSchema = z.object({
  content: z.string().min(10, "Generated content too short"),
  hashtags: z.array(z.string()).optional(),
})

class AIOutputFormatError extends Error {
  constructor(message = "AI output format error") {
    super(message)
    this.name = "AIOutputFormatError"
  }
}

function extractFirstJsonObject(raw: string) {
  const start = raw.indexOf("{")
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === "\\") {
        escaped = true
      } else if (ch === "\"") {
        inString = false
      }
      continue
    }

    if (ch === "\"") {
      inString = true
      continue
    }
    if (ch === "{") depth++
    if (ch === "}") {
      depth--
      if (depth === 0) {
        return raw.slice(start, i + 1)
      }
    }
  }

  return null
}

function parseJsonResult(raw: string) {
  try {
    return JSON.parse(raw || "{}")
  } catch {
    const fenced = raw?.match(/```json\n([\s\S]*?)\n```/)?.[1]
    if (fenced) {
      try {
        return JSON.parse(fenced)
      } catch {
        // Continue to object extraction.
      }
    }

    const objectCandidate = extractFirstJsonObject(raw || "")
    if (!objectCandidate) throw new AIOutputFormatError("Invalid JSON output")
    try {
      return JSON.parse(objectCandidate)
    } catch {
      throw new AIOutputFormatError("Unparseable JSON output")
    }
  }
}

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

function mapGenerateError(error: unknown): { status: number; body: Record<string, unknown> } {
  const status = typeof (error as any)?.status === "number" ? (error as any).status : undefined
  const message = error instanceof Error ? error.message : "Unknown error"
  const lower = message.toLowerCase()

  if (status === 429 || lower.includes("rate limit")) {
    return {
      status: 429,
      body: {
        error: "Model rate limit reached. Please retry shortly.",
        code: "MODEL_RATE_LIMIT",
        retryAfterSeconds: 20,
      },
    }
  }

  if (status === 401 || status === 403 || lower.includes("invalid api key")) {
    return {
      status: 503,
      body: {
        error: "AI provider authentication failed. Check GROK_API_KEY.",
        code: "PROVIDER_AUTH_FAILED",
      },
    }
  }

  if (lower.includes("missing grok_api_key")) {
    return {
      status: 503,
      body: { error: "Missing GROK_API_KEY in environment.", code: "MISSING_GROK_API_KEY" },
    }
  }

  if (lower.includes("decommissioned") || lower.includes("no longer supported")) {
    return {
      status: 503,
      body: {
        error: "Configured AI model is no longer supported. Update GROK_MODEL.",
        code: "MODEL_DEPRECATED",
      },
    }
  }

  if (error instanceof AIOutputFormatError || lower.includes("output format")) {
    return {
      status: 502,
      body: {
        error: "AI returned an invalid response format. Please retry.",
        code: "INVALID_AI_OUTPUT",
      },
    }
  }

  return {
    status: 500,
    body: { error: "Internal Server Error", code: "INTERNAL_ERROR" },
  }
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

    if (profile.coins < 3) {
      return NextResponse.json({ error: "Insufficient coins. Please purchase more." }, { status: 402 })
    }

    const messages = buildStructuredPrompt(persona, topic, targetPlatform)
    const generation = await generateWithGrok({
      messages,
      temperature: 0.35,
      maxTokens: 520,
    })
    const resultRaw = generation.text

    let resultJson: { content: string; hashtags?: string[] }
    try {
      const parsedRaw = parseJsonResult(resultRaw)
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
      model: generation.model,
    })
  } catch (error: any) {
    console.error("[Generate API] Error:", error)
    const mapped = mapGenerateError(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}
