type PromptPersona = {
  name: string
  title?: string | null
  personality: string
  writing_style: string
  training_posts?: string[]
}

type PromptMessage = { role: "system" | "user"; content: string }
type TargetPlatform = "linkedin"

// The post goes out under the user's name, so a made-up number or timeframe is a reputational risk.
const NO_INVENTION_RULE =
  "Never invent facts, numbers, names, timeframes or results that are not in the topic or examples. If a detail would help but is missing, leave a short [bracketed gap] for the user to fill in."

// Readers spot machine-written posts by their tics; these are the loudest ones.
export const PLAIN_VOICE_RULE =
  "Write like a person, not a content tool: no em dashes, no 'Here's the thing', no 'not X, it's Y' constructions, no 'game-changer', 'unlock', 'elevate' or 'delve'."

function compact(text: string, maxChars = 220) {
  const cleaned = text.replace(/\s+/g, " ").trim()
  return cleaned.length > maxChars ? `${cleaned.slice(0, maxChars - 1)}…` : cleaned
}

function buildExamples(trainingPosts?: string[], limit = 4) {
  const posts = (trainingPosts ?? []).slice(0, limit).map((p) => compact(p))
  if (!posts.length) return ""
  return posts.map((p, i) => `${i + 1}) ${p}`).join("\n")
}

export function buildStructuredPrompt(
  persona: PromptPersona,
  topic: string,
  _targetPlatform: TargetPlatform = "linkedin",
): PromptMessage[] {
  const examples = buildExamples(persona.training_posts, 3)
  const personaLine = `${persona.name}${persona.title ? `, ${persona.title}` : ""}`

  const systemMessage = [
    "Write one high-quality social post in strict JSON.",
    `Persona: ${personaLine}.`,
    "Platform: LinkedIn (professional long-form style).",
    `Voice: ${compact(persona.personality, 160)}.`,
    `Style: ${compact(persona.writing_style, 160)}.`,
    "Output: {\"content\":\"...\",\"hashtags\":[\"#...\",\"#...\"]}.",
    "Rules: 130-220 words, concise paragraphs, original wording, no markdown, no extra keys.",
    NO_INVENTION_RULE,
    PLAIN_VOICE_RULE,
    examples ? `Style examples:\n${examples}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const userMessage = `Topic: ${compact(topic, 260)}`
  return [
    { role: "system", content: systemMessage },
    { role: "user", content: userMessage },
  ]
}

export function buildWeeklyStructuredPrompt(
  persona: PromptPersona,
  topic?: string,
  _targetPlatform: TargetPlatform = "linkedin",
): PromptMessage[] {
  const examples = buildExamples(persona.training_posts, 4)
  const personaLine = `${persona.name}${persona.title ? `, ${persona.title}` : ""}`
  const topicLine = topic?.trim() ? compact(topic, 260) : "Use relevant current trend themes for this persona."

  const systemMessage = [
    "Generate exactly 7 social posts in strict JSON.",
    `Persona: ${personaLine}.`,
    "Platform: LinkedIn.",
    `Voice: ${compact(persona.personality, 160)}.`,
    `Style: ${compact(persona.writing_style, 160)}.`,
    "Output: {\"posts\":[{\"topic\":\"...\",\"content\":\"...\",\"hashtags\":[\"#...\"]}]}",
    "Rules: each content 110-210 words, varied hooks, no markdown fences, no extra keys.",
    NO_INVENTION_RULE,
    PLAIN_VOICE_RULE,
    examples ? `Style examples:\n${examples}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  return [
    { role: "system", content: systemMessage },
    { role: "user", content: `Weekly focus: ${topicLine}` },
  ]
}
