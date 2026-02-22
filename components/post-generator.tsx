"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCoins } from "@/hooks/use-coins"
import { useProfile } from "@/hooks/use-profile"
import { connectLinkedIn, connectX } from "@/lib/mutations"
import { toast } from "sonner"
import { handleDownloadImage } from "@/utils/download-image"
import { Check, ImagePlus, Linkedin, Loader2, Save, Sparkles, Wand2, X } from "lucide-react"

interface Persona {
  id: string
  name: string
  title: string | null
  personality: string
  writing_style: string
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

type Step = 1 | 2 | 3

function StepPill({ step, active, done, label }: { step: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
          active ? "border-primary bg-primary text-primary-foreground" : done ? "border-primary/40 bg-primary/10" : ""
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : step}
      </div>
      <span className={`text-sm ${active ? "font-medium" : "text-muted-foreground"}`}>{label}</span>
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
  const { profile } = useProfile()

  const [step, setStep] = useState<Step>(1)
  const [personaId, setPersonaId] = useState(selectedAvatar?.id || avatars[0]?.id || "")
  const [topic, setTopic] = useState("")
  const [generatedPost, setGeneratedPost] = useState("")

  const [imagePreset, setImagePreset] = useState("infographic")
  const [imagePrompt, setImagePrompt] = useState("")
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [generatedImagePublicId, setGeneratedImagePublicId] = useState<string | null>(null)

  const [isGeneratingPost, setIsGeneratingPost] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPostingLinkedIn, setIsPostingLinkedIn] = useState(false)
  const [isPostingX, setIsPostingX] = useState(false)

  const selectedPersona = useMemo(() => avatars.find((a) => a.id === personaId), [avatars, personaId])

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
      aiModelVersion: "DeepSeek-V3.1-Nex-N1",
    }),
    [personaId, topic, generatedPost, generatedImageUrl, generatedImagePublicId, imagePrompt, imagePreset],
  )

  const handleGeneratePost = useCallback(async () => {
    if (!topic.trim() || !personaId) return
    setIsGeneratingPost(true)

    try {
      const response = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId: personaId, topic }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to generate post")

      setGeneratedPost(data.data?.content || "")
      if (typeof data.remainingCoins === "number") {
        await mutateCoins(data.remainingCoins)
      }
      setStep(2)
      toast.success("Post generated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate post")
    } finally {
      setIsGeneratingPost(false)
    }
  }, [topic, personaId, mutateCoins])

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
      if (typeof data.remainingCoins === "number") {
        await mutateCoins(data.remainingCoins)
      }
      toast.success("Image generated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate image")
    } finally {
      setIsGeneratingImage(false)
    }
  }, [personaId, generatedPost, imagePreset, imagePrompt, mutateCoins])

  const handleSaveDraft = useCallback(async () => {
    if (!payload.personaId || !payload.topic || !payload.content) return
    setIsSaving(true)

    try {
      const response = await fetch("/api/save-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to save draft")

      toast.success("Saved to history")
      router.push("/dashboard/history")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save draft")
    } finally {
      setIsSaving(false)
    }
  }, [payload, router])

  const connectIfNeeded = useCallback(async (platform: "linkedin" | "x") => {
    if (platform === "linkedin") {
      if (profile?.linkedin_connected) return true
      const result = await connectLinkedIn("/dashboard/generate")
      if (!result.success || !result.authUrl) {
        toast.error(result.error || "Failed to start LinkedIn connect")
        return false
      }
      window.location.href = result.authUrl
      return false
    }

    if (profile?.x_connected) return true
    const result = await connectX("/dashboard/generate")
    if (!result.success || !result.authUrl) {
      toast.error(result.error || "Failed to start X connect")
      return false
    }
    window.location.href = result.authUrl
    return false
  }, [profile?.linkedin_connected, profile?.x_connected])

  const handlePostToLinkedIn = useCallback(async () => {
    if (!payload.personaId || !payload.topic || !payload.content) return
    setIsPostingLinkedIn(true)

    try {
      const ready = await connectIfNeeded("linkedin")
      if (!ready) return

      const response = await fetch("/api/post-to-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "LinkedIn publish failed")

      toast.success("Posted to LinkedIn")
      router.push("/dashboard/history")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "LinkedIn publish failed")
    } finally {
      setIsPostingLinkedIn(false)
    }
  }, [payload, connectIfNeeded, router])

  const handlePostToX = useCallback(async () => {
    if (!payload.personaId || !payload.topic || !payload.content) return
    setIsPostingX(true)

    try {
      const ready = await connectIfNeeded("x")
      if (!ready) return

      const response = await fetch("/api/post-to-x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "X publish failed")

      toast.success("Posted to X")
      router.push("/dashboard/history")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "X publish failed")
    } finally {
      setIsPostingX(false)
    }
  }, [payload, connectIfNeeded, router])

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-4">
            <StepPill step={1} active={step === 1} done={step > 1} label="Write" />
            <StepPill step={2} active={step === 2} done={step > 2} label="Visual" />
            <StepPill step={3} active={step === 3} done={false} label="Publish" />
          </div>
          <Badge variant="secondary" className="text-sm">{coins} coins</Badge>
        </CardContent>
      </Card>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" />Generate Post</CardTitle>
            <CardDescription>Pick persona and topic to generate your content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
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
              {selectedPersona && (
                <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Personality:</span> {selectedPersona.personality}</p>
                  <p><span className="font-medium text-foreground">Style:</span> {selectedPersona.writing_style}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Topic</Label>
              <Textarea
                rows={4}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What do you want to post about?"
              />
            </div>

            {generatedPost && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="mb-2 text-sm font-medium">Generated Draft</p>
                <ScrollArea className="h-40 pr-2">
                  <p className="whitespace-pre-wrap text-sm">{generatedPost}</p>
                </ScrollArea>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleGeneratePost} disabled={isGeneratingPost || !topic.trim() || !personaId || coins < 3}>
                {isGeneratingPost && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {generatedPost ? "Regenerate (3 coins)" : "Generate (3 coins)"}
              </Button>
              {generatedPost && (
                <Button variant="outline" className="bg-transparent" onClick={() => setStep(2)}>
                  Next: Add image
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ImagePlus className="h-5 w-5 text-primary" />Create Visual</CardTitle>
            <CardDescription>Optional image generation for higher engagement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
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
                <Textarea rows={3} value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Add specific visual instructions" />
              </div>
            </div>

            {generatedImageUrl && (
              <div className="space-y-3 rounded-lg border p-4">
                <img src={generatedImageUrl} alt="Generated visual" className="max-h-96 w-full rounded object-contain bg-muted" />
                <Button variant="outline" className="bg-transparent" size="sm" onClick={() => handleDownloadImage(generatedImageUrl, `personapost-${Date.now()}.png`)}>Download image</Button>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleGenerateImage} disabled={isGeneratingImage || coins < 5}>
                {isGeneratingImage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {generatedImageUrl ? "Regenerate (5 coins)" : "Generate image (5 coins)"}
              </Button>
              <Button variant="outline" className="bg-transparent" onClick={() => setStep(3)}>Continue to publish</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && selectedPersona && (
        <div className="grid gap-6 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Preview</CardTitle>
              <CardDescription>Final check before saving or publishing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                  {selectedPersona.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{selectedPersona.name}</p>
                  {selectedPersona.title && <p className="text-xs text-muted-foreground">{selectedPersona.title}</p>}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{generatedPost}</p>
              </div>
              {generatedImageUrl && (
                <img src={generatedImageUrl} alt="Preview visual" className="max-h-96 w-full rounded-lg border object-contain bg-muted" />
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2 h-fit">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Save as draft or publish directly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Draft
              </Button>

              <Button className="w-full" onClick={handlePostToLinkedIn} disabled={isPostingLinkedIn}>
                {isPostingLinkedIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Linkedin className="mr-2 h-4 w-4" />}
                {profile?.linkedin_connected ? "Post to LinkedIn" : "Connect + Post to LinkedIn"}
              </Button>

              <Button className="w-full" variant="secondary" onClick={handlePostToX} disabled={isPostingX}>
                {isPostingX ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                {profile?.x_connected ? "Post to X" : "Connect + Post to X"}
              </Button>

              <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>Connected:</p>
                <p>LinkedIn: {profile?.linkedin_connected ? "Yes" : "No"}</p>
                <p>X: {profile?.x_connected ? `Yes${profile.x_username ? ` (@${profile.x_username})` : ""}` : "No"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
