export type GrokMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

const GROK_API_URL = process.env.GROK_API_URL || "https://api.groq.com/openai/v1/chat/completions"
const DEFAULT_GROK_MODEL = process.env.GROK_MODEL || "llama-3.3-70b"
const MODEL_FALLBACKS = [
  DEFAULT_GROK_MODEL,
  "llama-3.3-70b",
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
]

function getGrokApiKey() {
  const key = process.env.GROK_API_KEY
  if (!key) {
    throw new Error("Missing GROK_API_KEY")
  }
  return key
}

export async function generateWithGrok({
  messages,
  maxTokens,
  temperature = 0.4,
  model = DEFAULT_GROK_MODEL,
}: {
  messages: GrokMessage[]
  maxTokens: number
  temperature?: number
  model?: string
}) {
  const apiKey = getGrokApiKey()
  const candidates = Array.from(new Set([model, ...MODEL_FALLBACKS]))
  let lastError: (Error & { status?: number }) | null = null

  for (const candidate of candidates) {
    const response = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: candidate,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    const json = await response.json().catch(() => ({}))
    if (response.ok) {
      return {
        text: json?.choices?.[0]?.message?.content || "",
        model: candidate,
      }
    }

    const message = json?.error?.message || json?.message || `Grok request failed (${response.status})`
    const error = new Error(message) as Error & { status?: number }
    error.status = response.status
    lastError = error

    const lower = String(message).toLowerCase()
    const modelProblem =
      response.status === 400 &&
      (lower.includes("decommissioned") ||
        lower.includes("no longer supported") ||
        lower.includes("not found") ||
        lower.includes("does not exist"))
    if (modelProblem) continue
    throw error
  }

  throw lastError || new Error("Grok request failed")
}
