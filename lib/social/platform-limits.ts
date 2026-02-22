export const X_POST_CHAR_LIMIT = 280

export function countXCharacters(content: string) {
  return Array.from((content || "").trim()).length
}

export function needsXLimit(platform?: string | null) {
  return platform === "x" || platform === "both"
}

export function isWithinXLimit(content: string) {
  return countXCharacters(content) <= X_POST_CHAR_LIMIT
}

export function enforceXLimit(content: string) {
  const normalized = (content || "").trim()
  return {
    count: countXCharacters(normalized),
    ok: isWithinXLimit(normalized),
    limit: X_POST_CHAR_LIMIT,
    normalized,
  }
}

