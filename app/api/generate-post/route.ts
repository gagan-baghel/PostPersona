import { createClient } from "@/lib/supabase/server"
import { streamText } from "ai"

export async function POST(request: Request) {
  try {
    const { avatarId, topic } = await request.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Get avatar details
    const { data: avatar } = await supabase
      .from("avatars")
      .select("*")
      .eq("id", avatarId)
      .eq("user_id", user.id)
      .single()

    if (!avatar) {
      return new Response("Avatar not found", { status: 404 })
    }

    // Generate post using AI SDK
    const result = streamText({
      model: "openai/gpt-4o-mini",
      prompt: `You are ${avatar.name}${avatar.title ? `, a ${avatar.title}` : ""}.

Personality traits: ${avatar.personality}
Writing style: ${avatar.writing_style}

Create a LinkedIn post about: ${topic}

Requirements:
- Write in first person as ${avatar.name}
- Match the personality and writing style described above
- Make it engaging and authentic
- Include appropriate formatting (line breaks, emojis if suitable)
- Keep it concise (200-300 words)
- Add a relevant hashtag or two at the end

Write the post now:`,
    })

    // Stream the response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.textStream) {
          const data = `data: ${JSON.stringify({ content: chunk })}\n\n`
          controller.enqueue(encoder.encode(data))
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[v0] Error generating post:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
