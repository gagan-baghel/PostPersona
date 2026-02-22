import { NextResponse } from "next/server"

import { verifyPassword } from "@/lib/auth/password"
import { attachSessionCookie } from "@/lib/auth/session"
import { convexQuery } from "@/lib/convex/client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = await convexQuery<any>("app:getUserByEmail", { email })
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name ?? null,
      },
    })
    attachSessionCookie(response, user._id)
    return response
  } catch (error) {
    console.error("[Auth Login] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
