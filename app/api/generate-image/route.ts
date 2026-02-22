import { NextResponse } from "next/server"

import { generateImage, IMAGE_PRESETS } from "@/lib/ai/nano-banana"
import { uploadImage } from "@/lib/cloudinary"
import { ImagePromptSchema } from "@/lib/validation/schemas"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = ImagePromptSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.format() }, { status: 400 })
    }

    const { postContent, imagePreset, customDescription } = validation.data
    const userId = getSessionUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await convexQuery<any>("app:getProfile", { userId })
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (profile.coins < 5) {
      return NextResponse.json(
        { error: "Insufficient coins (5 required).", required: 5, current: profile.coins },
        { status: 402 },
      )
    }

    const cleanContext = postContent.substring(0, 150).replace(/[\n\r]/g, " ").trim()
    const cleanDescription = customDescription ? customDescription.replace(/[^a-zA-Z0-9 .,:;-]/g, "") : ""

    const prompt = `Style: ${IMAGE_PRESETS[imagePreset || "corporate"]}.\nSubject: ${cleanDescription || "A professional visualization related to the post topic"}.\nContext: ${cleanContext}...`

    const aiResult = await generateImage(prompt, imagePreset)

    if (!aiResult.success || !aiResult.imageUrl) {
      throw new Error("AI Image Generation failed")
    }

    const uploadResult = await uploadImage(aiResult.imageUrl, `personapost/users/${userId}/generated`)

    const deduction = await convexMutation<any>("app:addCoins", {
      userId,
      amount: -5,
      type: "image_generation",
      description: `Generated ${imagePreset} image`,
    })

    if (!deduction?.ok) {
      return NextResponse.json({ error: "Transaction failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        preset: imagePreset,
      },
      remainingCoins: deduction.newBalance,
    })
  } catch (error) {
    console.error("[Generate Image API] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
