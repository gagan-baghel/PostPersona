import type { NextResponse } from "next/server"

export const LINKEDIN_OAUTH_NONCE_COOKIE = "pp_linkedin_oauth_nonce"
export const LINKEDIN_OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000

// Binds the OAuth `state` to the browser that started the flow. Pass "" to clear.
export function setLinkedInOAuthNonceCookie(response: NextResponse, nonce: string) {
  response.cookies.set(LINKEDIN_OAUTH_NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/linkedin/callback",
    maxAge: nonce ? LINKEDIN_OAUTH_STATE_MAX_AGE_MS / 1000 : 0,
  })
}

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
