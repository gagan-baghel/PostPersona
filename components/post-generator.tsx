"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCoins } from "@/hooks/use-coins"
import { toast } from "sonner"
import { handleDownloadImage } from "@/utils/download-image"
import { ImagePlus, Loader2, Save, Send, Wand2 } from "lucide-react"

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

type Step = 1 | 2 | 3

export function PostGenerator({
  avatars,
  selectedAvatar,
}: {
  avatars: Persona[]
  selectedAvatar: Persona | null
}) {
  const router = useRouter()
  const { coins, mutateCoins } = useCoins()

  const [step, setStep] = useState<Step>(1)
  const [personaId, setPersonaId] = useState(selectedAvatar?.id || avatars[0]?.id || "")
  const [topic, setTopic] = useState("")
  const [generatedPost, setGeneratedPost] = useState("")

  const [imagePreset, setImagePreset] = useState("infographic")
  const [imagePrompt, setImagePrompt] = useState("")
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [generatedImagePublicId, setGeneratedImagePublicId] = useState<string | null>(null)

  const [targetPlatform, setTargetPlatform] = useState<"linkedin" | "x" | "both">("linkedin")

  const [isGeneratingPost, setIsGeneratingPost] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

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
      aiModelVersion: "gemini-2.0-flash",
      targetPlatform,
    }),
    [personaId, topic, generatedPost, generatedImageUrl, generatedImagePublicId, imagePrompt, imagePreset, targetPlatform],
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
      setStep(3)
      toast.success("Draft generated")
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
      setStep(3)
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

  const handleSendToReview = useCallback(async () => {
    if (!payload.personaId || !payload.topic || !payload.content) return
    setIsSubmittingReview(true)

    try {
      const response = await fetch("/api/posts/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to submit for review")

      toast.success("Sent to Review Queue")
      router.push("/dashboard/review")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send for review")
    } finally {
      setIsSubmittingReview(false)
    }
  }, [payload, router])

  return (
    <div className="space-y-4">
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" />Generate Post</CardTitle>
            <CardDescription>Persona + topic.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                {generatedPost ? "Regenerate (3 coins)" : "Generate Draft (3 coins)"}
              </Button>
              {generatedPost && (
                <Button variant="outline" className="bg-transparent" onClick={() => setStep(3)}>
                  Continue to review
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ImagePlus className="h-5 w-5 text-primary" />Generate Image (Explicit)</CardTitle>
            <CardDescription>Optional visual.</CardDescription>
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
              <Button variant="outline" className="bg-transparent" onClick={() => setStep(3)}>Back to review</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && selectedPersona && (
        <div className="grid gap-6 xl:grid-cols-5">
          <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Draft Preview</CardTitle>
            <CardDescription>Final check before sending.</CardDescription>
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
              {generatedImageUrl && <img src={generatedImageUrl} alt="Preview visual" className="max-h-96 w-full rounded-lg border object-contain bg-muted" />}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2 h-fit">
            <CardHeader>
              <CardTitle>Queue Controls</CardTitle>
              <CardDescription>Save draft or send to review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Target platform</Label>
                <Select value={targetPlatform} onValueChange={(v: "linkedin" | "x" | "both") => setTargetPlatform(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="x">X</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" variant="outline" onClick={() => setStep(2)}>
                <ImagePlus className="mr-2 h-4 w-4" /> Generate image (optional)
              </Button>

              <Button className="w-full" variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft}>
                {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Draft
              </Button>

              <Button className="w-full" onClick={handleSendToReview} disabled={isSubmittingReview}>
                {isSubmittingReview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Send to Review Queue
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
