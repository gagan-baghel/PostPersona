import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const SESSION_COOKIE = "pp_session"
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url")
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8")
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET
  if (secret) return secret

  if (process.env.NODE_ENV !== "production") {
    const fallback = process.env.NEXT_PUBLIC_CONVEX_URL || "local-dev-secret"
    console.warn(
      "[auth] SESSION_SECRET is missing. Using an insecure development fallback. Set SESSION_SECRET in .env.local.",
    )
    return `dev-session-secret:${fallback}`
  }

  throw new Error("Missing SESSION_SECRET")
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url")
}

// Prefix keeps OAuth-state signatures from ever being valid as session-token signatures (and vice versa).
const OAUTH_STATE_SIG_PREFIX = "oauth-state."

export function signOAuthState(data: Record<string, unknown>): string {
  const payload = base64UrlEncode(JSON.stringify(data))
  return `${payload}.${signPayload(OAUTH_STATE_SIG_PREFIX + payload)}`
}

export function verifyOAuthState(state: string | null | undefined): Record<string, unknown> | null {
  const [payload, signature, ...rest] = (state ?? "").split(".")
  if (!payload || !signature || rest.length > 0) return null

  const expected = Buffer.from(signPayload(OAUTH_STATE_SIG_PREFIX + payload))
  const actual = Buffer.from(signature)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null

  try {
    const data = JSON.parse(base64UrlDecode(payload))
    return data && typeof data === "object" && !Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

export function createSessionToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = `${userId}.${exp}`
  const encoded = base64UrlEncode(payload)
  const sig = signPayload(payload)
  return `${encoded}.${sig}`
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null

  const [encodedPayload, signature] = token.split(".")
  if (!encodedPayload || !signature) return null

  let payload = ""
  try {
    payload = base64UrlDecode(encodedPayload)
  } catch {
    return null
  }

  const expectedSig = Buffer.from(signPayload(payload))
  const actualSig = Buffer.from(signature)
  if (actualSig.length !== expectedSig.length || !timingSafeEqual(actualSig, expectedSig)) return null

  const [userId, expRaw] = payload.split(".")
  const exp = Number(expRaw)
  if (!userId || Number.isNaN(exp)) return null
  if (Math.floor(Date.now() / 1000) > exp) return null

  return userId
}

export function getCookieValueFromHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(";")
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=")
    if (k === name) return rest.join("=")
  }
  return null
}

export function getSessionUserIdFromRequest(request: Request): string | null {
  const token = getCookieValueFromHeader(request.headers.get("cookie"), SESSION_COOKIE)
  return verifySessionToken(token)
}

export async function getSessionUserIdFromServerCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  return verifySessionToken(token)
}

export function attachSessionCookie(response: NextResponse, userId: string) {
  const token = createSessionToken(userId)
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
