"use client"

import { useState, useCallback, useMemo, memo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { handleDownloadImage } from "@/utils/download-image"
import { useCoins } from "@/hooks/use-coins"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { Check, Target, Zap, TrendingUp, Share2, MessageCircle, Heart, BarChart3 } from "lucide-react"

// --- Interfaces ---

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

// --- Constants ---

const IMAGE_PRESETS = [
  { value: "infographic", label: "Infographic", description: "Clean data visualization style" },
  { value: "timeline", label: "Timeline", description: "Step-by-step process visualization" },
  { value: "corporate", label: "Corporate", description: "Professional business aesthetic" },
  { value: "fun", label: "Fun", description: "Playful and engaging style" },
  { value: "ghibli", label: "Ghibli", description: "Artistic illustration style" },
  { value: "realistic", label: "Realistic", description: "Photo-realistic imagery" },
  { value: "custom", label: "Custom Input", description: "Describe exactly what you want" },
]

type Step = 1 | 2 | 3

// --- Sub-Components ---

const StepsIndicator = memo(function StepsIndicator({ currentStep }: { currentStep: Step }) {
  return (
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
              {step === 1 ? "Create Post" : step === 2 ? "Create Image" : "Preview & Analyze"}
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
  )
})



const GeneratedPostPreview = memo(function GeneratedPostPreview({ content }: { content: string }) {
  if (!content) return null
  return (
    <div className="rounded-md border bg-muted/50 p-4">
      <h3 className="mb-2 text-sm font-semibold">Generated Post</h3>
      <ScrollArea className="h-48">
        <div className="whitespace-pre-wrap pr-4 text-sm leading-relaxed">{content}</div>
      </ScrollArea>
    </div>
  )
})

const Step1CreatePost = memo(function Step1CreatePost({
  avatars,
  avatarId,
  setAvatarId,
  selectedAvatarData,
  topic,
  setTopic,
  generatedPost,
  isGenerating,
  coins,
  onGenerate,
  onNext,
}: {
  avatars: Avatar[]
  avatarId: string
  setAvatarId: (id: string) => void
  selectedAvatarData: Avatar | undefined
  topic: string
  setTopic: (topic: string) => void
  generatedPost: string
  isGenerating: boolean
  coins: number
  onGenerate: () => void
  onNext: () => void
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-6">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Step 1: Create Post</h2>
          <p className="text-sm text-muted-foreground">Select a persona and describe what you want to talk about</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatar">Select Persona</Label>
          <Select value={avatarId} onValueChange={setAvatarId}>
            <SelectTrigger id="avatar">
              <SelectValue placeholder="Choose a persona" />
            </SelectTrigger>
            <SelectContent>
              {avatars.map((persona) => (
                <SelectItem key={persona.id} value={persona.id}>
                  {persona.name} {persona.title && `- ${persona.title}`}
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

        {!isGenerating && <GeneratedPostPreview content={generatedPost} />}

        <div className="flex gap-3">
          <Button
            onClick={onGenerate}
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
            <Button onClick={onNext} size="lg" variant="outline" className="flex-1 bg-transparent">
              Next: Add Image →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})

const Step2CreateImage = memo(function Step2CreateImage({
  generatedPost,
  imagePreset,
  setImagePreset,
  imagePrompt,
  setImagePrompt,
  previousImagePrompt,
  generatedImageUrl,
  isGeneratingImage,
  coins,
  onGenerateImage,
  onSkip,
  onNext,
}: {
  generatedPost: string
  imagePreset: string
  setImagePreset: (val: string) => void
  imagePrompt: string
  setImagePrompt: (val: string) => void
  previousImagePrompt: string
  generatedImageUrl: string | null
  isGeneratingImage: boolean
  coins: number
  onGenerateImage: () => void
  onSkip: () => void
  onNext: () => void
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-6">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Step 2: Create Image</h2>
          <p className="text-sm text-muted-foreground">
            Add a visual element to make your post stand out, or skip to preview
          </p>
        </div>

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
          <Label htmlFor="imagePrompt">
            {imagePreset === 'custom' ? "Describe your image" : "Refine Image Description (Optional)"}
          </Label>
          <Textarea
            id="imagePrompt"
            placeholder={imagePreset === 'custom'
              ? "Describe exactly what image you want generated..."
              : "E.g., 'Include a graph showing growth trends' or 'Use blue and orange colors'"}
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            rows={3}
            required={imagePreset === 'custom'}
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
            onClick={onGenerateImage}
            disabled={isGeneratingImage || coins < 5 || (imagePreset === 'custom' && !imagePrompt.trim())}
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
            onClick={generatedImageUrl ? onNext : onSkip}
            variant="outline"
            size="lg"
            className="flex-1 bg-transparent"
          >
            {generatedImageUrl ? "Next: Analyze →" : "Skip Image"}
          </Button>
        </div>
      </div>
    </div>
  )
})

const Step3Preview = memo(function Step3Preview({
  selectedAvatarData,
  generatedPost,
  generatedImageUrl,
  isSaving,
  onSave,
}: {
  selectedAvatarData: Avatar
  generatedPost: string
  generatedImageUrl: string | null
  isSaving: boolean
  onSave: () => void
}) {
  // Mock data for analytics
  const analyticsData = useMemo(() => {
    // Deterministic random numbers based on content length
    const seed = generatedPost.length
    const viralityScore = Math.min(98, 70 + (seed % 25))
    const hookScore = Math.min(100, 85 + (seed % 15))
    const readabilityScore = Math.min(100, 80 + (seed % 20))

    return [
      { name: 'Likes', value: Math.floor(viralityScore * 1.5), color: '#3b82f6' },
      { name: 'Comments', value: Math.floor(viralityScore * 0.4), color: '#8b5cf6' },
      { name: 'Shares', value: Math.floor(viralityScore * 0.2), color: '#10b981' },
    ]
  }, [generatedPost])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left Column: Post Preview */}
      <div className="rounded-lg border bg-card p-6 h-fit">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          Preview
        </h3>

        <div className="space-y-4">
          <div className="flex items-start gap-3 pb-3 border-b border-border/50">
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
              {selectedAvatarData.title && <div className="text-xs text-muted-foreground">{selectedAvatarData.title}</div>}
              <div className="mt-1 text-xs text-muted-foreground">Just now • 🌐</div>
            </div>
          </div>

          <div className="pb-3">
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{generatedPost}</div>
          </div>

          {generatedImageUrl && (
            <div className="mb-3 overflow-hidden rounded-lg border">
              <img
                src={generatedImageUrl || "/placeholder.svg"}
                alt="Post visual"
                className="h-auto w-full max-h-[400px] object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Analytics & Actions */}
      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Performance Prediction
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 flex flex-col items-center text-center">
              <div className="p-2 rounded-full bg-primary/10 mb-2">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <span className="text-3xl font-bold text-primary">92</span>
              <span className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">Virality Score</span>
            </div>
            <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/10 flex flex-col items-center text-center">
              <div className="p-2 rounded-full bg-orange-500/10 mb-2">
                <Zap className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-3xl font-bold text-orange-600">High</span>
              <span className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">Hook Strength</span>
            </div>
          </div>

          <div className="h-[200px] w-full mb-6">
            <p className="text-sm font-medium mb-4 text-center">Projected Engagement</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {analyticsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-md">
              <span className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4" /> Best time to post
              </span>
              <span className="font-medium">Tue, 10:00 AM</span>
            </div>
            <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-md">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Zap className="w-4 h-4" /> Hook Impact
              </span>
              <span className="font-medium text-green-600">Strong Start</span>
            </div>
          </div>
        </div>

        <Button
          onClick={onSave}
          disabled={isSaving}
          size="lg"
          className="w-full text-base font-semibold h-14"
        >
          {isSaving ? (
            <>
              <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving to History...
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              Done
            </>
          )}
        </Button>
      </div>
    </div>
  )
})

// --- Main Component ---

export function PostGenerator({
  avatars,
  selectedAvatar,
}: {
  avatars: Avatar[]
  selectedAvatar: Avatar | null
}) {
  // Use the coins hook for real-time coin balance
  const { coins, deductCoins, mutateCoins } = useCoins()
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

  // Step 3: Analytics state
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const selectedAvatarData = useMemo(() => avatars.find((a) => a.id === avatarId), [avatars, avatarId])

  const handleGeneratePost = useCallback(async () => {
    if (!topic.trim() || !avatarId) return

    setIsGenerating(true)
    setError(null)
    setGeneratedPost("")

    try {
      if (!selectedAvatarData) {
        throw new Error("Please select a persona")
      }

      // Generate dummy post with streaming effect
      const dummyPost = `🚀 ${topic}\n\nThis is a dummy LinkedIn post generated for testing purposes. In production, this would be an AI-generated post based on the avatar's personality and writing style.\n\nKey insights:\n• First important point about ${topic}\n• Second valuable takeaway\n• Third actionable insight\n\nThe real implementation will use the AI SDK with proper streaming, but for now we're using this placeholder to test the UI flow and coin deduction logic.\n\nWhat are your thoughts on ${topic}? Drop a comment below! 👇\n\n#${topic.replace(/\s+/g, "")} #PersonaPost #ContentCreation`

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
      await mutateCoins(newBalance)

      // STAY in Step 1 - user must click Next manually
    } catch (err) {
      console.error("[v0] Error generating post:", err)
      setError(err instanceof Error ? err.message : "Failed to generate post")
      setGeneratedPost("")
    } finally {
      setIsGenerating(false)
    }
  }, [topic, avatarId, selectedAvatarData])

  const handleNextToImage = useCallback(() => {
    setCurrentStep(2)
  }, [])

  const handleGenerateImage = useCallback(async () => {
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
      await mutateCoins(newBalance)
    } catch (err) {
      console.error("[v0] Error generating image:", err)
      setError(err instanceof Error ? err.message : "Failed to generate image")
      setGeneratedImageUrl(null)
    } finally {
      setIsGeneratingImage(false)
    }
  }, [generatedPost, imagePreset, imagePrompt, topic])

  const handleSkipImage = useCallback(() => {
    setCurrentStep(3)
  }, [])

  const handleContinueToPreview = useCallback(() => {
    setCurrentStep(3)
  }, [])

  const handleSavePost = useCallback(async () => {
    setIsSaving(true)
    setError(null)

    try {
      if (!avatarId || !topic || !generatedPost) {
        throw new Error("Missing required post data")
      }

      // Save to database
      const response = await fetch("/api/save-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: avatarId,
          topic,
          content: generatedPost,
          imageUrl: generatedImageUrl,
          imagePrompt: imagePrompt || null,
          imagePreset: generatedImageUrl ? imagePreset : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save post")
      }

      // Success - redirect to history
      router.push("/dashboard/history")
      router.refresh()
    } catch (err) {
      console.error("[v0] Error saving post:", err)
      setError(err instanceof Error ? err.message : "Failed to save post")
    } finally {
      setIsSaving(false)
    }
  }, [avatarId, topic, generatedPost, generatedImageUrl, imagePrompt, imagePreset, router])

  return (
    <div className="space-y-8">
      <StepsIndicator currentStep={currentStep} />


      {currentStep === 1 && (
        <Step1CreatePost
          avatars={avatars}
          avatarId={avatarId}
          setAvatarId={setAvatarId}
          selectedAvatarData={selectedAvatarData}
          topic={topic}
          setTopic={setTopic}
          generatedPost={generatedPost}
          isGenerating={isGenerating}
          coins={coins}
          onGenerate={handleGeneratePost}
          onNext={handleNextToImage}
        />
      )}

      {currentStep === 2 && (
        <Step2CreateImage
          generatedPost={generatedPost}
          imagePreset={imagePreset}
          setImagePreset={setImagePreset}
          imagePrompt={imagePrompt}
          setImagePrompt={setImagePrompt}
          previousImagePrompt={previousImagePrompt}
          generatedImageUrl={generatedImageUrl}
          isGeneratingImage={isGeneratingImage}
          coins={coins}
          onGenerateImage={handleGenerateImage}
          onSkip={handleSkipImage}
          onNext={handleContinueToPreview}
        />
      )}

      {currentStep === 3 && selectedAvatarData && (
        <Step3Preview
          selectedAvatarData={selectedAvatarData}
          generatedPost={generatedPost}
          generatedImageUrl={generatedImageUrl}
          isSaving={isSaving}
          onSave={handleSavePost}
        />
      )}

      {/* Error Display */}
      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    </div>
  )
}
