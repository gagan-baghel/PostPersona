import { NextResponse } from "next/server"

import { AI_ENGINES, generateText, mapAIError, type AIEngine } from "@/lib/ai/llm"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"

// Settings "Test connection": proves the CLI is installed *and* logged in.
export async function POST(request: Request) {
  if (!getSessionUserIdFromRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (typeof body.engine !== "string" || !(body.engine in AI_ENGINES)) {
    return NextResponse.json({ error: "Unknown engine" }, { status: 400 })
  }

  const started = Date.now()
  try {
    const result = await generateText({
      messages: [{ role: "user", content: "Reply with exactly: Connected" }],
      maxTokens: 10,
      engine: body.engine as AIEngine,
    })
    return NextResponse.json({ ok: true, model: result.model, ms: Date.now() - started })
  } catch (error) {
    const mapped = mapAIError(error)
    return NextResponse.json({ ok: false, ...mapped.body }, { status: mapped.status })
  }
}
