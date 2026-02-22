import { NextResponse } from "next/server"

import { generateUploadSignature } from "@/lib/cloudinary"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const signatureData = generateUploadSignature(userId)
    return NextResponse.json(signatureData)
  } catch (error) {
    console.error("Error generating upload signature:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
