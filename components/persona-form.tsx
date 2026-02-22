"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { mutate } from "swr"
import { CACHE_KEYS } from "@/lib/cache-keys"

interface Persona {
    id: string
    name: string
    title: string | null
    personality: string
    writing_style: string
    training_posts?: string[]
    avatar_url: string | null
}

export function PersonaForm({ persona, onSuccess }: { persona?: Persona; onSuccess?: () => void }) {
    const [name, setName] = useState(persona?.name || "")
    const [title, setTitle] = useState(persona?.title || "")
    const [personality, setPersonality] = useState(persona?.personality || "")
    const [writingStyle, setWritingStyle] = useState(persona?.writing_style || "")
    const [trainingPostsText, setTrainingPostsText] = useState((persona?.training_posts ?? []).join("\n\n---\n\n"))
    const [avatarUrl, setAvatarUrl] = useState(persona?.avatar_url || "")
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const trainingPosts = trainingPostsText
                .split(/\n\s*---\s*\n/g)
                .map((p) => p.trim())
                .filter(Boolean)

            if (trainingPosts.length > 0 && (trainingPosts.length < 2 || trainingPosts.length > 10)) {
                throw new Error("Please provide 2 to 10 high-performing example posts (or leave it empty).")
            }

            if (persona) {
                const response = await fetch(`/api/personas/${persona.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        title: title || undefined,
                        personality,
                        writing_style: writingStyle,
                        training_posts: trainingPosts,
                        avatar_url: avatarUrl || undefined,
                    }),
                })
                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}))
                    throw new Error(payload.error || "Failed to update persona")
                }
            } else {
                const response = await fetch("/api/personas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        title: title || undefined,
                        personality,
                        writing_style: writingStyle,
                        training_posts: trainingPosts,
                        avatar_url: avatarUrl || undefined,
                    }),
                })
                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}))
                    throw new Error(payload.error || "Failed to create persona")
                }
            }

            // Invalidate cache
            await mutate(CACHE_KEYS.personas)

            if (onSuccess) {
                onSuccess()
            } else {
                router.push("/dashboard/personas")
                router.refresh()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred")
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Persona Name *</Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="e.g., Professional Sarah, Tech Expert Mike"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title / Role</Label>
                        <Input
                            id="title"
                            type="text"
                            placeholder="e.g., Senior Product Manager, AI Researcher"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="personality">Personality *</Label>
                        <Textarea
                            id="personality"
                            placeholder="Describe the personality traits, tone, and approach. E.g., Thoughtful, analytical, empathetic, direct, humorous..."
                            required
                            value={personality}
                            onChange={(e) => setPersonality(e.target.value)}
                            rows={4}
                        />
                        <p className="text-xs text-muted-foreground">
                            Define the character traits that will influence how this persona communicates
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="writingStyle">Writing Style *</Label>
                        <Textarea
                            id="writingStyle"
                            placeholder="Describe the writing style. E.g., Clear and concise, uses storytelling, includes data and examples, conversational..."
                            required
                            value={writingStyle}
                            onChange={(e) => setWritingStyle(e.target.value)}
                            rows={4}
                        />
                        <p className="text-xs text-muted-foreground">Specify how this persona should write and structure content</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="avatarUrl">Persona Image URL</Label>
                        <Input
                            id="avatarUrl"
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Optional: Add a profile image for this persona</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="trainingPosts">Winning Posts (2 to 10)</Label>
                        <Textarea
                            id="trainingPosts"
                            placeholder="Paste one high-performing post...\n\n---\n\nPaste another post..."
                            value={trainingPostsText}
                            onChange={(e) => setTrainingPostsText(e.target.value)}
                            rows={10}
                        />
                        <p className="text-xs text-muted-foreground">
                            Add 2 to 10 of your best posts, separated by `---`. These are used to fine-tune generation style.
                        </p>
                    </div>
                </div>
            </div>

            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <div className="flex gap-4">
                <Button type="submit" disabled={isLoading} size="lg">
                    {isLoading ? (persona ? "Updating..." : "Creating...") : persona ? "Update Persona" : "Create Persona"}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => (onSuccess ? onSuccess() : router.back())}
                    className="bg-transparent"
                >
                    Cancel
                </Button>
            </div>
        </form>
    )
}

// Legacy export for backwards compatibility
export { PersonaForm as AvatarForm }
