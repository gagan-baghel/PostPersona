import { NextResponse } from "next/server"

import { hashPassword } from "@/lib/auth/password"
import { attachSessionCookie } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const passwordHash = hashPassword(password)
    const result = await convexMutation<any>("app:createUser", {
      email,
      passwordHash,
      fullName: fullName || undefined,
    })

    if (!result?.ok) {
      const status = result?.error === "EMAIL_EXISTS" ? 409 : 400
      const message = result?.error === "EMAIL_EXISTS" ? "Email already in use" : "Unable to create account"
      return NextResponse.json({ error: message }, { status })
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.userId,
        email,
        full_name: fullName || null,
      },
    })
    attachSessionCookie(response, result.userId)
    return response
  } catch (error) {
    console.error("[Auth SignUp] Error:", error)
    if (error instanceof Error && error.message.includes("Missing SESSION_SECRET")) {
      return NextResponse.json(
        { error: "Server auth configuration is missing (SESSION_SECRET)." },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
