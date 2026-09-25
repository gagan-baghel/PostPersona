import { NextResponse } from "next/server"
import { z } from "zod"

import { PLAIN_VOICE_RULE } from "@/lib/ai/prompt-builder"
import { AIOutputFormatError, creditCost, generateText, mapAIError, parseJsonLoose, resolveEngine } from "@/lib/ai/llm"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"
import { CREDIT_COSTS } from "@/lib/pricing"

// One prompt per Growth Toolkit tab. Everything returns {"options": [...]} so the UI renders them the same way.
const TOOLS = {
  headline:
    "You are a LinkedIn profile strategist. Write 5 alternative LinkedIn headlines. LinkedIn cuts headlines at 220 characters, so keep each under 190 characters including any [bracketed gap]. Each one says who the person helps, how, and one proof point. Avoid buzzwords like 'passionate' or 'guru'.",
  about:
    "You are a LinkedIn profile strategist. Write 2 alternative LinkedIn About sections, 180-300 words each, first person. The first two lines must hook the reader (they show before 'see more'). Include concrete proof and end with a clear call to action. Plain text with short paragraphs.",
  comment:
    "Write 4 alternative comments on the LinkedIn post below. Each adds a genuine insight, a sharp question or a relevant experience, 25-70 words. No generic praise, no 'Great post', no hashtags, no emojis.",
  hooks:
    "Write 6 alternative opening hooks (the first 1-2 lines, under 200 characters) for the LinkedIn draft below. Use a different angle for each: contrarian take, short story, specific number, question, bold claim, mistake I made.",
  ideas:
    "Suggest 10 specific LinkedIn post ideas for the person below. Each option is one line: a working title, then ' - ', then the angle in one sentence. Mix formats: story, how-to, opinion, lesson learned, carousel outline.",
  connect:
    "Write 3 alternative LinkedIn connection request notes to the person described below, each under 280 characters. Specific and warm, reference something real about them, no sales pitch.",
} as const

const AssistSchema = z.object({
  tool: z.enum(Object.keys(TOOLS) as [keyof typeof TOOLS, ...(keyof typeof TOOLS)[]]),
  input: z.string().trim().min(5, "Add a bit more detail").max(4000, "Input too long"),
  personaId: z.string().optional(),
})

const OutputSchema = z.object({ options: z.array(z.string().min(1)).min(1) })

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const parsed = AssistSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 })
    }
    const { tool, input, personaId } = parsed.data

    const [profile, persona] = await Promise.all([
      convexQuery<any>("app:getProfile", { userId }),
      personaId ? convexQuery<any>("app:getPersonaById", { personaId, userId }) : null,
    ])
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

    const engine = resolveEngine(profile.ai_provider)
    const cost = creditCost(engine, CREDIT_COSTS.tool)
    if ((profile.coins ?? 0) < cost) {
      return NextResponse.json({ error: "Insufficient coins. Please purchase more." }, { status: 402 })
    }

    const system = [
      TOOLS[tool],
      persona
        ? `Write in the voice of ${persona.name}${persona.title ? `, ${persona.title}` : ""}. Personality: ${persona.personality}. Style: ${persona.writing_style}.`
        : "",
      "Use only facts, numbers, names and timeframes that appear in the input. Never invent proof. Where proof would help but is missing, write a short [bracketed gap] for the user to fill in.",
      PLAIN_VOICE_RULE,
      'Respond with strict JSON only: {"options":["...","..."]}. No markdown, no extra keys.',
    ]
      .filter(Boolean)
      .join("\n")

    const generation = await generateText({
      messages: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
      temperature: 0.6,
      maxTokens: 1400,
      engine,
    })

    const output = OutputSchema.safeParse(parseJsonLoose(generation.text))
    if (!output.success) throw new AIOutputFormatError("Toolkit output malformed")

    const deduction = cost
      ? await convexMutation<any>("app:addCoins", {
          userId,
          amount: -cost,
          type: "post_generation",
          description: `Growth toolkit: ${tool}`,
        })
      : { ok: true, newBalance: profile.coins }
    if (!deduction?.ok) return NextResponse.json({ error: "Transaction failed" }, { status: 500 })

    return NextResponse.json({
      success: true,
      options: output.data.options.map((o) => o.trim()),
      engine: generation.engine,
      remainingCoins: deduction.newBalance,
    })
  } catch (error) {
    console.error("[AI Assist] Error:", error)
    const mapped = mapAIError(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}
