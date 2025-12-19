"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { handleDownloadImage } from "@/utils/download-image" // Import handleDownloadImage

interface Avatar {
  id: string
  name: string
  title: string | null
  personality: string
  writing_style: string
  avatar_url: string | null
}

interface Profile {
  coins: number
}

const IMAGE_PRESETS = [
  { value: "infographic", label: "Infographic", description: "Clean data visualization style" },
  { value: "timeline", label: "Timeline", description: "Step-by-step process visualization" },
  { value: "corporate", label: "Corporate", description: "Professional business aesthetic" },
  { value: "fun", label: "Fun", description: "Playful and engaging style" },
  { value: "ghibli", label: "Ghibli", description: "Artistic illustration style" },
  { value: "realistic", label: "Realistic", description: "Photo-realistic imagery" },
]

type Step = 1 | 2 | 3

export function PostGenerator({
  avatars,
  selectedAvatar,
  userProfile,
}: {
  avatars: Avatar[]
  selectedAvatar: Avatar | null
  userProfile: Profile
}) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [avatarId, setAvatarId] = useState(selectedAvatar?.id || avatars[0]?.id || "")
  const [topic, setTopic] = useState("")
  const [generatedPost, setGeneratedPost] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  // Step 2: Image generation state
  const [imagePreset, setImagePreset] = useState("infographic")
  const [imagePrompt, setImagePrompt] = useState("")
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [previousImagePrompt, setPreviousImagePrompt] = useState("")

  // Step 3: LinkedIn state
  const [isPostingToLinkedIn, setIsPostingToLinkedIn] = useState(false)
  const [linkedInConnected, setLinkedInConnected] = useState(false)

  const [coins, setCoins] = useState(userProfile.coins)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const selectedAvatarData = avatars.find((a) => a.id === avatarId)

  const handleGeneratePost = async () => {
    if (!topic.trim() || !avatarId) return

    setIsGenerating(true)
    setError(null)
    setGeneratedPost("")

    try {
      if (!selectedAvatarData) {
        throw new Error("Please select an avatar")
      }

      // Generate dummy post with streaming effect
      const dummyPost = `🚀 ${topic}

This is a dummy LinkedIn post generated for testing purposes. In production, this would be an AI-generated post based on the avatar's personality and writing style.

Key insights:
• First important point about ${topic}
• Second valuable takeaway
• Third actionable insight

The real implementation will use the AI SDK with proper streaming, but for now we're using this placeholder to test the UI flow and coin deduction logic.

What are your thoughts on ${topic}? Drop a comment below! 👇

#${topic.replace(/\s+/g, "")} #PersonaPost #ContentCreation`

      // Simulate streaming
      const chunks = dummyPost.split(" ")
      for (let i = 0; i < chunks.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        setGeneratedPost((prev) => prev + (i > 0 ? " " : "") + chunks[i])
      }

      // Deduct 3 coins atomically on backend
      const response = await fetch("/api/deduct-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 3,
          transaction_type: "post_generation",
          description: `Generated post: ${topic}`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to deduct coins")
      }

      const { newBalance } = await response.json()
      setCoins(newBalance)

      // STAY in Step 1 - user must click Next manually
    } catch (err) {
      console.error("[v0] Error generating post:", err)
      setError(err instanceof Error ? err.message : "Failed to generate post")
      setGeneratedPost("")
    } finally {
      setIsGenerating(false)
    }
  }

  // Explicit handler to move to Step 2
  const handleNextToImage = () => {
    setCurrentStep(2)
  }

  const handleGenerateImage = async () => {
    if (!generatedPost) return

    setIsGeneratingImage(true)
    setError(null)

    try {
      // Preserve previous prompt for easy iteration
      const fullPrompt = imagePreset + " " + (imagePrompt || topic)
      setPreviousImagePrompt(fullPrompt)

      const placeholderUrl = `/placeholder.svg?height=400&width=800&query=${encodeURIComponent(fullPrompt)}`

      // Simulate image generation
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setGeneratedImageUrl(placeholderUrl)

      // Deduct 5 coins atomically on backend
      const response = await fetch("/api/deduct-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 5,
          transaction_type: "image_generation",
          description: `Generated image with ${imagePreset} preset`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to deduct coins for image")
      }

      const { newBalance } = await response.json()
      setCoins(newBalance)
    } catch (err) {
      console.error("[v0] Error generating image:", err)
      setError(err instanceof Error ? err.message : "Failed to generate image")
      setGeneratedImageUrl(null)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleSkipImage = () => {
    setCurrentStep(3)
  }

  const handleContinueToPreview = () => {
    setCurrentStep(3)
  }

  const handlePostToLinkedIn = async () => {
    setIsPostingToLinkedIn(true)
    setError(null)

    try {
      if (!avatarId || !topic || !generatedPost) {
        throw new Error("Missing required post data")
      }

      // Simulate LinkedIn posting delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Dummy successful post - backend ready for real posting
      const response = await fetch("/api/post-to-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarId,
          topic,
          content: generatedPost,
          imageUrl: generatedImageUrl,
          imagePrompt: imagePrompt || null,
          imagePreset: generatedImageUrl ? imagePreset : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to post to LinkedIn")
      }

      // Success - redirect to history
      router.push("/dashboard/history")
      router.refresh()
    } catch (err) {
      console.error("[v0] Error posting to LinkedIn:", err)
      setError(err instanceof Error ? err.message : "Failed to post to LinkedIn")
    } finally {
      setIsPostingToLinkedIn(false)
    }
  }

  // Real LinkedIn OAuth connection flow
  const handleConnectLinkedIn = async () => {
    try {
      // In production, this would redirect to LinkedIn OAuth
      // For now, simulate the flow with a popup-style experience
      const response = await fetch("/api/linkedin/connect", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to initiate LinkedIn connection")
      }

      const { authUrl } = await response.json()

      // Open LinkedIn OAuth in popup (or redirect)
      window.location.href = authUrl
    } catch (err) {
      console.error("[v0] Error connecting LinkedIn:", err)
      setError(err instanceof Error ? err.message : "Failed to connect LinkedIn")
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors",
                  currentStep === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : currentStep > step
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 bg-background text-muted-foreground",
                )}
              >
                {step}
              </div>
              <span
                className={cn("text-xs font-medium", currentStep >= step ? "text-foreground" : "text-muted-foreground")}
              >
                {step === 1 ? "Create Post" : step === 2 ? "Create Image" : "Preview & Publish"}
              </span>
            </div>
            {step < 3 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-16 transition-colors",
                  currentStep > step ? "bg-primary" : "bg-muted-foreground/30",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Coins Display */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">Your Coins</p>
              <p className="text-xs text-muted-foreground">Post: 3 coins • Image: 5 coins each</p>
            </div>
          </div>
          <p className="text-2xl font-bold">{coins}</p>
        </div>
      </div>

      {currentStep === 1 && (
        <div className="rounded-lg border bg-card p-6">
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-xl font-semibold">Step 1: Create Post</h2>
              <p className="text-sm text-muted-foreground">Select an avatar and describe what you want to talk about</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">Select Avatar</Label>
              <Select value={avatarId} onValueChange={setAvatarId}>
                <SelectTrigger id="avatar">
                  <SelectValue placeholder="Choose an avatar" />
                </SelectTrigger>
                <SelectContent>
                  {avatars.map((avatar) => (
                    <SelectItem key={avatar.id} value={avatar.id}>
                      {avatar.name} {avatar.title && `- ${avatar.title}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAvatarData && (
                <div className="mt-3 rounded-md bg-muted p-3 text-xs">
                  <p className="font-medium">Personality: {selectedAvatarData.personality}</p>
                  <p className="mt-1 font-medium">Style: {selectedAvatarData.writing_style}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">What do you want to talk about?</Label>
              <Textarea
                id="topic"
                placeholder="E.g., 'The importance of work-life balance in tech' or '5 lessons I learned from leading a remote team'"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={4}
              />
            </div>

            {generatedPost && !isGenerating && (
              <div className="rounded-md border bg-muted/50 p-4">
                <h3 className="mb-2 text-sm font-semibold">Generated Post</h3>
                <ScrollArea className="h-48">
                  <div className="whitespace-pre-wrap pr-4 text-sm leading-relaxed">{generatedPost}</div>
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleGeneratePost}
                disabled={isGenerating || !topic.trim() || !avatarId || coins < 3}
                size="lg"
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating Post...
                  </>
                ) : coins < 3 ? (
                  "Not Enough Coins (Need 3)"
                ) : generatedPost ? (
                  "Regenerate Post (3 coins)"
                ) : (
                  "Generate Post (3 coins)"
                )}
              </Button>

              {generatedPost && !isGenerating && (
                <Button onClick={handleNextToImage} size="lg" variant="outline" className="flex-1 bg-transparent">
                  Next: Add Image →
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="rounded-lg border bg-card p-6">
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-xl font-semibold">Step 2: Create Image</h2>
              <p className="text-sm text-muted-foreground">
                Add a visual element to make your post stand out, or skip to preview
              </p>
            </div>

            {/* Show generated post summary */}
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">Your Post:</p>
              <p className="mt-1 line-clamp-2 text-sm">{generatedPost}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preset">Image Preset</Label>
              <Select value={imagePreset} onValueChange={setImagePreset}>
                <SelectTrigger id="preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      <div>
                        <div className="font-medium">{preset.label}</div>
                        <div className="text-xs text-muted-foreground">{preset.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagePrompt">Refine Image Description (Optional)</Label>
              <Textarea
                id="imagePrompt"
                placeholder="E.g., 'Include a graph showing growth trends' or 'Use blue and orange colors'"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={3}
              />
              {previousImagePrompt && <p className="text-xs text-muted-foreground">Previous: {previousImagePrompt}</p>}
            </div>

            {generatedImageUrl && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Generated Image</h3>
                  <Button
                    onClick={() => handleDownloadImage(generatedImageUrl, `personapost-${Date.now()}.png`)}
                    size="sm"
                    variant="outline"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download
                  </Button>
                </div>
                <ScrollArea className="h-64 rounded-md">
                  <img
                    src={generatedImageUrl || "/placeholder.svg"}
                    alt="Generated post image"
                    className="h-auto w-full rounded"
                  />
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || coins < 5}
                size="lg"
                className="flex-1"
              >
                {isGeneratingImage ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : coins < 5 ? (
                  "Not Enough Coins (Need 5)"
                ) : generatedImageUrl ? (
                  "Regenerate Image (5 coins)"
                ) : (
                  "Generate Image (5 coins)"
                )}
              </Button>
              <Button
                onClick={generatedImageUrl ? handleContinueToPreview : handleSkipImage}
                variant="outline"
                size="lg"
                className="flex-1 bg-transparent"
              >
                {generatedImageUrl ? "Next: Preview →" : "Skip Image"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 3 && selectedAvatarData && (
        <div className="rounded-lg border bg-card p-6">
          <div className="space-y-6">
            {/* Post header */}
            <div className="flex items-start gap-3 pb-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                {selectedAvatarData.avatar_url ? (
                  <img
                    src={selectedAvatarData.avatar_url || "/placeholder.svg"}
                    alt={selectedAvatarData.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-primary">
                    {selectedAvatarData.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{selectedAvatarData.name}</div>
                {selectedAvatarData.title && (
                  <div className="text-xs text-muted-foreground">{selectedAvatarData.title}</div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">Just now • 🌐</div>
              </div>
            </div>

            {/* Post content */}
            <div className="pb-3">
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{generatedPost}</div>
            </div>

            {/* Post image */}
            {generatedImageUrl && (
              <div className="mb-3 overflow-hidden rounded-lg border">
                <img
                  src={generatedImageUrl || "/placeholder.svg"}
                  alt="Post visual"
                  className="h-auto w-full max-h-[400px] object-cover"
                />
              </div>
            )}

            {/* Engagement bar */}
            <div className="flex items-center justify-between border-y py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[8px] text-white">
                    👍
                  </div>
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">
                    ❤️
                  </div>
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">
                    💡
                  </div>
                </div>
                <span>24</span>
              </div>
              <div className="flex gap-3">
                <span>5 comments</span>
                <span>2 reposts</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-4 gap-1 pt-2">
              {["Like", "Comment", "Repost", "Send"].map((action) => (
                <Button key={action} variant="ghost" size="sm" className="h-9 text-xs font-medium">
                  {action}
                </Button>
              ))}
            </div>
          </div>

          {!linkedInConnected && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 flex-shrink-0 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium">Connect your LinkedIn account</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Authenticate with LinkedIn OAuth to enable direct posting
                  </p>
                  <Button onClick={handleConnectLinkedIn} size="sm" className="mt-3">
                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    Connect LinkedIn
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handlePostToLinkedIn}
            disabled={isPostingToLinkedIn || !linkedInConnected}
            size="lg"
            className="w-full text-base font-semibold"
          >
            {isPostingToLinkedIn ? (
              <>
                <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Publishing...
              </>
            ) : !linkedInConnected ? (
              "Connect LinkedIn to Post"
            ) : (
              "Post to LinkedIn"
            )}
          </Button>
        </div>
      )}

      {/* Error Display */}
      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    </div>
  )
}
