function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, "")
}

export function resolveLinkedInRedirectUri(request: Request) {
  const explicit = process.env.LINKEDIN_REDIRECT_URI?.trim()
  if (explicit) {
    return normalizeOrigin(explicit)
  }

  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host")?.trim()

  if (proto && host) {
    return `${proto}://${host}/api/linkedin/callback`
  }

  const origin = new URL(request.url).origin
  return `${normalizeOrigin(origin)}/api/linkedin/callback`
}
