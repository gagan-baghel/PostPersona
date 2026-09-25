import "server-only"

import { spawn } from "child_process"
import { accessSync, constants, mkdtempSync, readFileSync, rmSync } from "fs"
import { homedir, tmpdir } from "os"
import path from "path"

import { generateWithGrok, type GrokMessage } from "@/lib/ai/grok"

// Local engines run the user's own CLI login (Claude / ChatGPT subscription), so they cost no credits.
// They only work where the server can see the CLI, i.e. when PersonaPost runs on your own machine.
export const AI_ENGINES = {
  "claude-code": { label: "Claude Code", detail: "Your Claude subscription via the claude CLI on this machine", local: true },
  codex: { label: "Codex", detail: "Your ChatGPT subscription via the codex CLI on this machine", local: true },
  groq: { label: "Groq API", detail: "Hosted API key (GROK_API_KEY), billed in credits", local: false },
} as const

export type AIEngine = keyof typeof AI_ENGINES

const CLI_TIMEOUT_MS = 180_000
const EXTRA_BIN_DIRS = [path.join(homedir(), ".local", "bin"), "/opt/homebrew/bin", "/usr/local/bin"]

export class AIEngineError extends Error {
  status = 503
  constructor(message: string) {
    super(message)
    this.name = "AIEngineError"
  }
}

export class AIOutputFormatError extends Error {
  constructor(message = "AI output format error") {
    super(message)
    this.name = "AIOutputFormatError"
  }
}

// ponytail: POSIX PATH lookup only; add .cmd/.exe probing if someone runs this on Windows.
function findBinary(name: string) {
  const dirs = [...(process.env.PATH || "").split(path.delimiter), ...EXTRA_BIN_DIRS]
  for (const dir of dirs) {
    if (!dir) continue
    const candidate = path.join(dir, name)
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // keep looking
    }
  }
  return null
}

function isAvailable(engine: AIEngine) {
  if (engine === "groq") return Boolean(process.env.GROK_API_KEY)
  return Boolean(findBinary(engine === "claude-code" ? "claude" : "codex"))
}

export function listEngines() {
  return (Object.keys(AI_ENGINES) as AIEngine[]).map((id) => ({ id, ...AI_ENGINES[id], available: isAvailable(id) }))
}

/** The user's preferred engine if it is usable here, otherwise the first usable one (local CLIs first). */
export function resolveEngine(preferred?: string | null): AIEngine | null {
  const available = listEngines().filter((e) => e.available)
  return (available.find((e) => e.id === preferred) ?? available[0])?.id ?? null
}

export function creditCost(engine: AIEngine | null, base: number) {
  return engine && AI_ENGINES[engine].local ? 0 : base
}

function lastMeaningfulLine(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const line = [...lines].reverse().find((l) => l.startsWith("ERROR")) ?? lines.at(-1) ?? ""
  return line.replace(/^ERROR:?\s*/, "").slice(0, 300)
}

function runCli(bin: string, args: string[], stdin: string, cwd: string) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const env = { ...process.env }
    // Force subscription auth: an API key in .env.local would otherwise bill the API instead.
    delete env.ANTHROPIC_API_KEY
    delete env.OPENAI_API_KEY
    delete env.CLAUDECODE

    const child = spawn(bin, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGKILL")
    }, CLI_TIMEOUT_MS)

    child.stdout.on("data", (d) => (stdout += d))
    child.stderr.on("data", (d) => (stderr += d))
    child.on("error", (err) => {
      clearTimeout(timer)
      reject(new AIEngineError(`Could not start ${path.basename(bin)}: ${err.message}`))
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (timedOut) return reject(new AIEngineError(`${path.basename(bin)} timed out after ${CLI_TIMEOUT_MS / 1000}s`))
      resolve({ code, stdout, stderr })
    })
    child.stdin.end(stdin)
  })
}

async function runClaudeCode(system: string, user: string) {
  const bin = findBinary("claude")
  if (!bin) throw new AIEngineError("Claude Code CLI not found. Install it and run `claude` once to log in.")

  const { stdout, stderr } = await runCli(
    bin,
    [
      "-p",
      "--output-format", "json",
      "--tools", "",
      "--setting-sources", "",
      "--strict-mcp-config",
      "--disable-slash-commands",
      "--no-session-persistence",
      "--system-prompt", system,
    ],
    user,
    tmpdir(),
  )

  let json: any
  try {
    json = JSON.parse(stdout)
  } catch {
    throw new AIEngineError(`Claude Code failed: ${lastMeaningfulLine(stderr || stdout) || "no output"}`)
  }
  if (json?.is_error || typeof json?.result !== "string") {
    throw new AIEngineError(`Claude Code: ${json?.result || json?.subtype || "unknown error"}`)
  }
  return { text: json.result as string, model: Object.keys(json.modelUsage ?? {})[0] || "claude-code" }
}

async function runCodex(system: string, user: string) {
  const bin = findBinary("codex")
  if (!bin) throw new AIEngineError("Codex CLI not found. Install it and run `codex login`.")

  const dir = mkdtempSync(path.join(tmpdir(), "personapost-codex-"))
  try {
    const outFile = path.join(dir, "last-message.txt")
    const prompt = `${system}\n\nDo not run commands or edit files. Reply with text only.\n\n${user}`
    const { code, stdout, stderr } = await runCli(
      bin,
      ["exec", "--skip-git-repo-check", "--ephemeral", "-s", "read-only", "--color", "never", "-c", 'model_reasoning_effort="low"', "-o", outFile, "-"],
      prompt,
      dir,
    )
    if (code !== 0) throw new AIEngineError(`Codex failed: ${lastMeaningfulLine(stderr || stdout) || `exit code ${code}`}`)
    return { text: readFileSync(outFile, "utf8"), model: "codex" }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export async function generateText({
  messages,
  maxTokens,
  temperature,
  engine,
}: {
  messages: GrokMessage[]
  maxTokens: number
  temperature?: number
  engine: AIEngine | null
}): Promise<{ text: string; model: string; engine: AIEngine }> {
  if (!engine) {
    throw new AIEngineError("No AI engine available. Install Claude Code or Codex, or set GROK_API_KEY.")
  }
  if (engine === "groq") {
    const result = await generateWithGrok({ messages, maxTokens, temperature })
    return { ...result, engine }
  }

  // CLIs pick their own token budget and temperature.
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n")
  const user = messages.filter((m) => m.role !== "system").map((m) => m.content).join("\n\n")
  const result = engine === "claude-code" ? await runClaudeCode(system, user) : await runCodex(system, user)
  return { ...result, engine }
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
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === "\"") inString = false
      continue
    }
    if (ch === "\"") {
      inString = true
      continue
    }
    if (ch === "{") depth++
    if (ch === "}") {
      depth--
      if (depth === 0) return raw.slice(start, i + 1)
    }
  }
  return null
}

/** Multi-paragraph answers often arrive with raw line breaks inside JSON strings; escape them. */
function escapeControlCharsInStrings(raw: string) {
  let out = ""
  let inString = false
  let escaped = false
  for (const ch of raw) {
    if (inString && !escaped && ch < " ") {
      out += ch === "\n" ? "\\n" : ch === "\t" ? "\\t" : ch === "\r" ? "" : " "
      continue
    }
    if (escaped) escaped = false
    else if (ch === "\\") escaped = inString
    else if (ch === "\"") inString = !inString
    out += ch
  }
  return out
}

/** Models wrap JSON in prose or fences; take the first thing that parses. */
export function parseJsonLoose(raw: string): any {
  const candidates = [raw, raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1], extractFirstJsonObject(raw)]
  for (const candidate of candidates) {
    if (!candidate) continue
    for (const text of [candidate, escapeControlCharsInStrings(candidate)]) {
      try {
        return JSON.parse(text)
      } catch {
        // try the next shape
      }
    }
  }
  throw new AIOutputFormatError("Unparseable JSON output")
}

export function mapAIError(error: unknown): { status: number; body: Record<string, unknown> } {
  const status = typeof (error as any)?.status === "number" ? (error as any).status : undefined
  const message = error instanceof Error ? error.message : "Unknown error"
  const lower = message.toLowerCase()

  if (error instanceof AIEngineError) {
    return { status: 503, body: { error: `${message} You can switch AI engine in Settings.`, code: "AI_ENGINE_FAILED" } }
  }
  if (status === 429 || lower.includes("rate limit")) {
    return {
      status: 429,
      body: { error: "Model rate limit reached. Please retry shortly.", code: "MODEL_RATE_LIMIT", retryAfterSeconds: 20 },
    }
  }
  if (status === 401 || status === 403 || lower.includes("invalid api key")) {
    return { status: 503, body: { error: "AI provider authentication failed. Check GROK_API_KEY.", code: "PROVIDER_AUTH_FAILED" } }
  }
  if (lower.includes("missing grok_api_key")) {
    return { status: 503, body: { error: "Missing GROK_API_KEY in environment.", code: "MISSING_GROK_API_KEY" } }
  }
  if (lower.includes("decommissioned") || lower.includes("no longer supported")) {
    return { status: 503, body: { error: "Configured AI model is no longer supported. Update GROK_MODEL.", code: "MODEL_DEPRECATED" } }
  }
  if (error instanceof AIOutputFormatError) {
    return { status: 502, body: { error: "AI returned an invalid response format. Please retry.", code: "INVALID_AI_OUTPUT" } }
  }
  return { status: 500, body: { error: "Internal Server Error", code: "INTERNAL_ERROR" } }
}
