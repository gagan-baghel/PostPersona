"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { useCoins } from "@/hooks/use-coins"
import { toast } from "sonner"
import { handleDownloadImage } from "@/utils/download-image"
import { BarChart2, Heart, ImagePlus, Loader2, MessageCircle, Repeat2, Save, Send, Wand2 } from "lucide-react"
import { X_POST_CHAR_LIMIT, countXCharacters, needsXLimit } from "@/lib/social/platform-limits"

interface Persona {
  id: string
  name: string
  title: string | null
  personality: string
  writing_style: string
  training_posts?: string[]
  avatar_url: string | null
}

const IMAGE_PRESETS = [
  { value: "infographic", label: "Infographic" },
  { value: "corporate", label: "Corporate" },
  { value: "fun", label: "Fun" },
  { value: "ghibli", label: "Ghibli" },
  { value: "realistic", label: "Realistic" },
  { value: "sketch", label: "Sketch" },
]

function LinkedInPreview({
  persona,
  content,
  imageUrl,
}: {
  persona?: Persona
  content: string
  imageUrl?: string | null
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
          {(persona?.name || "P").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{persona?.name || "Persona"}</p>
          <p className="truncate text-xs text-muted-foreground">{persona?.title || "Professional"}</p>
          <p className="text-[11px] text-muted-foreground">Now</p>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>

      {imageUrl ? (
        <div className="mt-3 overflow-hidden rounded-lg border">
          <img src={imageUrl} alt="Preview" className="h-auto w-full object-cover" />
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-4 border-t pt-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1"><Heart className="h-3.5 w-3.5" /> Like</div>
        <div className="flex items-center justify-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> Comment</div>
        <div className="flex items-center justify-center gap-1"><Repeat2 className="h-3.5 w-3.5" /> Repost</div>
        <div className="flex items-center justify-center gap-1"><Send className="h-3.5 w-3.5" /> Send</div>
      </div>
    </div>
  )
}

function XPreview({
  persona,
  content,
  imageUrl,
}: {
  persona?: Persona
  content: string
  imageUrl?: string | null
}) {
  const handle = (persona?.name || "persona").toLowerCase().replace(/[^a-z0-9]/g, "") || "persona"

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-start gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {(persona?.name || "P").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{persona?.name || "Persona"}</p>
          <p className="truncate text-xs text-muted-foreground">@{handle} · now</p>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>

      {imageUrl ? (
        <div className="mt-3 overflow-hidden rounded-2xl border">
          <img src={imageUrl} alt="Preview" className="h-auto w-full object-cover" />
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-4 text-xs text-muted-foreground">
        <div className="flex items-center justify-center"><MessageCircle className="h-3.5 w-3.5" /></div>
        <div className="flex items-center justify-center"><Repeat2 className="h-3.5 w-3.5" /></div>
        <div className="flex items-center justify-center"><Heart className="h-3.5 w-3.5" /></div>
        <div className="flex items-center justify-center"><BarChart2 className="h-3.5 w-3.5" /></div>
      </div>
    </div>
  )
}

export function PostGenerator({
  avatars,
  selectedAvatar,
}: {
  avatars: Persona[]
  selectedAvatar: Persona | null
}) {
  const router = useRouter()
  const { coins, mutateCoins } = useCoins()

  const [personaId, setPersonaId] = useState(selectedAvatar?.id || avatars[0]?.id || "")
  const [topic, setTopic] = useState("")
  const [generatedPost, setGeneratedPost] = useState("")
  const [generatedModel, setGeneratedModel] = useState<string | null>(null)

  const [targetPlatform, setTargetPlatform] = useState<"linkedin" | "x" | "both">("linkedin")

  const [showImageTools, setShowImageTools] = useState(false)
  const [imagePreset, setImagePreset] = useState("infographic")
  const [imagePrompt, setImagePrompt] = useState("")
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [generatedImagePublicId, setGeneratedImagePublicId] = useState<string | null>(null)

  const [isGeneratingPost, setIsGeneratingPost] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)

  const selectedPersona = useMemo(() => avatars.find((a) => a.id === personaId), [avatars, personaId])
  const xCharCount = useMemo(() => countXCharacters(generatedPost), [generatedPost])
  const xLimitedPlatform = useMemo(() => needsXLimit(targetPlatform), [targetPlatform])
  const isXTooLong = xLimitedPlatform && xCharCount > X_POST_CHAR_LIMIT

  const payload = useMemo(
    () => ({
      personaId,
      topic,
      content: generatedPost,
      imageUrl: generatedImageUrl,
      cloudinaryPublicId: generatedImagePublicId,
      cloudinarySecureUrl: generatedImageUrl,
      imagePrompt: imagePrompt || null,
      imagePreset: generatedImageUrl ? imagePreset : null,
      aiModelVersion: generatedModel || "llama-3.3-70b",
      targetPlatform,
    }),
    [
      personaId,
      topic,
      generatedPost,
      generatedImageUrl,
      generatedImagePublicId,
      imagePrompt,
      imagePreset,
      generatedModel,
      targetPlatform,
    ],
  )

  const handleGeneratePost = useCallback(async () => {
    if (!topic.trim() || !personaId) return
    setIsGeneratingPost(true)

    try {
      const response = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId: personaId, topic, targetPlatform }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to generate post")

      setGeneratedPost(data.data?.content || "")
      setGeneratedModel(typeof data.model === "string" ? data.model : null)
      if (typeof data.remainingCoins === "number") await mutateCoins(data.remainingCoins)
      toast.success("Draft generated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate post")
    } finally {
      setIsGeneratingPost(false)
    }
  }, [topic, personaId, mutateCoins, targetPlatform])

  const handleGenerateImage = useCallback(async () => {
    if (!generatedPost.trim()) return
    setIsGeneratingImage(true)

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          postContent: generatedPost,
          imagePreset,
          customDescription: imagePrompt,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to generate image")

      setGeneratedImageUrl(data.data?.url || null)
      setGeneratedImagePublicId(data.data?.publicId || null)
      if (typeof data.remainingCoins === "number") await mutateCoins(data.remainingCoins)
      toast.success("Image generated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate image")
    } finally {
      setIsGeneratingImage(false)
    }
  }, [personaId, generatedPost, imagePreset, imagePrompt, mutateCoins])

  const handleSaveDraft = useCallback(async () => {
    if (!payload.personaId || !payload.topic || !payload.content) return
    setIsSavingDraft(true)

    try {
      const response = await fetch("/api/save-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, workflowStatus: "draft" }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to save draft")

      toast.success("Saved as draft")
      router.push("/dashboard/history")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save draft")
    } finally {
      setIsSavingDraft(false)
    }
  }, [payload, router])

  const handleAddToQueue = useCallback(async () => {
    if (!payload.personaId || !payload.topic || !payload.content) return
    setIsScheduling(true)

    try {
      const response = await fetch("/api/posts/single/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to schedule post")

      toast.success("Post added to schedule queue")
      router.push("/dashboard/review")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to schedule")
    } finally {
      setIsScheduling(false)
    }
  }, [payload, router])

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" />Create Post</CardTitle>
          <CardDescription>Generate one post and add it directly to schedule queue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-2">
            <Label>Persona</Label>
            <Select value={personaId} onValueChange={setPersonaId}>
              <SelectTrigger><SelectValue placeholder="Select persona" /></SelectTrigger>
              <SelectContent>
                {avatars.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>{persona.name}{persona.title ? ` - ${persona.title}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Topic</Label>
            <Textarea rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What do you want to post about?" />
          </div>

          <div className="space-y-2">
            <Label>Target platform</Label>
            <Select value={targetPlatform} onValueChange={(v: "linkedin" | "x" | "both") => setTargetPlatform(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="x">X</SelectItem>
                <SelectItem value="both">LinkedIn + X</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button className="w-full sm:w-auto" onClick={handleGeneratePost} disabled={isGeneratingPost || !topic.trim() || !personaId || coins < 3}>
              {isGeneratingPost && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {generatedPost ? "Regenerate (3 coins)" : "Generate Draft (3 coins)"}
            </Button>
            <Button variant="outline" className="w-full sm:w-auto bg-transparent" onClick={() => setShowImageTools((v) => !v)}>
              <ImagePlus className="mr-2 h-4 w-4" />
              {showImageTools ? "Hide Image Tools" : "Image (Optional)"}
            </Button>
          </div>

          {showImageTools && (
            <div className="rounded-lg border p-3 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Image style</Label>
                  <Select value={imagePreset} onValueChange={setImagePreset}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IMAGE_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prompt (optional)</Label>
                  <Input value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Visual direction" />
                </div>
              </div>
              <Button className="w-full sm:w-auto" onClick={handleGenerateImage} disabled={isGeneratingImage || !generatedPost || coins < 5}>
                {isGeneratingImage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {generatedImageUrl ? "Regenerate Image (5 coins)" : "Generate Image (5 coins)"}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-3">
            <Button onClick={handleAddToQueue} disabled={isScheduling || !generatedPost || isXTooLong}>
              {isScheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Add to Schedule Queue
            </Button>
            <Button variant="outline" className="bg-transparent" onClick={handleSaveDraft} disabled={isSavingDraft || !generatedPost || isXTooLong}>
              {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Draft
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>{targetPlatform === "both" ? "LinkedIn + X" : targetPlatform === "x" ? "X" : "LinkedIn"} style card preview</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
          {!generatedPost ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Generate a draft to preview it here.</div>
          ) : (
            <>
              {(targetPlatform === "linkedin" || targetPlatform === "both") && (
                <LinkedInPreview persona={selectedPersona} content={generatedPost} imageUrl={generatedImageUrl} />
              )}
              {(targetPlatform === "x" || targetPlatform === "both") && (
                <XPreview persona={selectedPersona} content={generatedPost} imageUrl={generatedImageUrl} />
              )}
              {xLimitedPlatform && (
                <p className={`text-xs ${isXTooLong ? "text-destructive" : "text-muted-foreground"}`}>
                  X character count: {xCharCount}/{X_POST_CHAR_LIMIT}
                  {isXTooLong ? " (too long for X)" : ""}
                </p>
              )}
              {generatedImageUrl && (
                <Button variant="outline" className="w-full bg-transparent" size="sm" onClick={() => handleDownloadImage(generatedImageUrl, `personapost-${Date.now()}.png`)}>
                  Download image
                </Button>
              )}
              <ScrollArea className="h-24 rounded border p-2">
                <p className="text-xs text-muted-foreground">Model: {generatedModel || "llama-3.3-70b"}</p>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
