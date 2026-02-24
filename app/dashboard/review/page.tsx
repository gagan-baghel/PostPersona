'use client'

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PageHeader } from "@/components/dashboard/page-header"
import { toast } from "sonner"
import { CalendarClock, CheckCircle2, Clock3, GripVertical, RefreshCw, Sparkles, Trash2, XCircle } from "lucide-react"

interface ReviewPost {
  id: string
  topic: string
  content: string
  workflow_status?: string
  target_platform?: string
  queue_position?: number | null
  scheduled_for?: number | null
  review_notes?: string | null
  publish_attempt_count?: number | null
  publish_last_error?: string | null
  publish_next_retry_at?: number | null
  personas: { name: string; title: string | null } | null
}

interface PersonaOption {
  id: string
  name: string
}

type PlatformTag = "linkedin" | "x"

interface UserConnections {
  linkedin_connected: boolean
  x_connected: boolean
  auto_post_enabled: boolean
}

function toDateTimeInputValue(ts?: number | null) {
  if (!ts) return ""
  const d = new Date(ts)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function QueueLinkedInPreview({
  name,
  title,
  content,
}: {
  name: string
  title?: string | null
  content: string
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{title || "Professional"}</p>
          <p className="text-[11px] text-muted-foreground">Queued</p>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      <div className="mt-3 grid grid-cols-4 border-t pt-2 text-xs text-muted-foreground">
        <div className="text-center">Like</div>
        <div className="text-center">Comment</div>
        <div className="text-center">Repost</div>
        <div className="text-center">Send</div>
      </div>
    </div>
  )
}

function QueueXPreview({
  name,
  content,
}: {
  name: string
  content: string
}) {
  const handle = name.toLowerCase().replace(/[^a-z0-9]/g, "") || "persona"

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-start gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">@{handle} · queued</p>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      <div className="mt-3 grid grid-cols-4 text-xs text-muted-foreground">
        <div className="text-center">Reply</div>
        <div className="text-center">Repost</div>
        <div className="text-center">Like</div>
        <div className="text-center">Views</div>
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<ReviewPost[]>([])
  const [personas, setPersonas] = useState<PersonaOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [manualScheduleById, setManualScheduleById] = useState<Record<string, string>>({})
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "approve" | "reject" | "reschedule" | "delete" | "replay" } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [scheduleWeekOpen, setScheduleWeekOpen] = useState(false)
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false)
  const [weekPersonaId, setWeekPersonaId] = useState("")
  const [weekTopic, setWeekTopic] = useState("")
  const [weekPlatform, setWeekPlatform] = useState<"linkedin" | "x" | "both">("linkedin")
  const [previewPost, setPreviewPost] = useState<ReviewPost | null>(null)
  const [connections, setConnections] = useState<UserConnections>({
    linkedin_connected: false,
    x_connected: false,
    auto_post_enabled: false,
  })

  const reviewPosts = useMemo(() => posts.filter((p) => p.workflow_status === "review"), [posts])
  const scheduledPosts = useMemo(
    () =>
      posts
        .filter((p) => p.workflow_status === "scheduled")
        .sort((a, b) => {
          const aq = typeof a.queue_position === "number" ? a.queue_position : Number.MAX_SAFE_INTEGER
          const bq = typeof b.queue_position === "number" ? b.queue_position : Number.MAX_SAFE_INTEGER
          if (aq !== bq) return aq - bq
          return (a.scheduled_for ?? 0) - (b.scheduled_for ?? 0)
        }),
    [posts],
  )
  const deadLetterPosts = useMemo(() => posts.filter((p) => p.workflow_status === "dead_letter"), [posts])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [reviewResponse, personasResponse, userResponse] = await Promise.all([
        fetch("/api/posts/review"),
        fetch("/api/personas"),
        fetch("/api/user"),
      ])

      const [reviewData, personasData, userData] = await Promise.all([
        reviewResponse.json().catch(() => []),
        personasResponse.json().catch(() => []),
        userResponse.json().catch(() => ({})),
      ])

      if (!reviewResponse.ok) throw new Error(reviewData.error || "Failed to load review posts")
      if (!personasResponse.ok) throw new Error(personasData.error || "Failed to load personas")
      if (!userResponse.ok) throw new Error(userData.error || "Failed to load account status")

      setPosts(Array.isArray(reviewData) ? reviewData : [])

      const options = Array.isArray(personasData)
        ? personasData.map((p: any) => ({ id: String(p.id), name: String(p.name || "Untitled Persona") }))
        : []
      setPersonas(options)
      setWeekPersonaId((prev) => prev || options[0]?.id || "")

      setConnections({
        linkedin_connected: Boolean(userData.linkedin_connected),
        x_connected: Boolean(userData.x_connected),
        auto_post_enabled: Boolean(userData.auto_post_enabled),
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (searchParams.get("scheduleWeek") === "1") {
      setScheduleWeekOpen(true)
    }
  }, [searchParams])

  const platformBadgeLabel = (platform?: string) => {
    if (platform === "x") return "X"
    if (platform === "both") return "LinkedIn + X"
    return "LinkedIn"
  }

  const toPlatformTags = (platform?: string): PlatformTag[] => {
    if (platform === "both") return ["linkedin", "x"]
    if (platform === "x") return ["x"]
    return ["linkedin"]
  }

  const platformName = (platform: PlatformTag) => (platform === "x" ? "X" : "LinkedIn")

  const openPreview = (post: ReviewPost) => setPreviewPost(post)

  const handleScheduledCardClick = (event: MouseEvent, post: ReviewPost) => {
    const target = event.target as HTMLElement
    if (target.closest("button,input,textarea,select,label,[role='switch']")) return
    openPreview(post)
  }

  const updateScheduledTargets = async (id: string, targets: PlatformTag[]) => {
    setWorkingId(id)
    try {
      const response = await fetch(`/api/posts/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setTargets", targets }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to update targets")

      if (data.deleted) {
        toast.success("Post deleted because no platforms were selected")
      } else {
        toast.success("Platform targets updated")
      }
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update targets")
    } finally {
      setWorkingId(null)
    }
  }

  const hasLinkedInScheduled = useMemo(
    () => scheduledPosts.some((post) => toPlatformTags(post.target_platform).includes("linkedin")),
    [scheduledPosts],
  )
  const hasXScheduled = useMemo(
    () => scheduledPosts.some((post) => toPlatformTags(post.target_platform).includes("x")),
    [scheduledPosts],
  )
  const hasAnyChannelConnected = connections.linkedin_connected || connections.x_connected

  const setAutoPost = async (enabled: boolean) => {
    const next = enabled && hasAnyChannelConnected
    try {
      const response = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_post_enabled: next }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to update automatic post")
      setConnections((prev) => ({ ...prev, auto_post_enabled: next }))
      toast.success(next ? "Automatic post enabled" : "Automatic post disabled")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update automatic post")
    }
  }

  const reviewAction = async (id: string, action: "approve" | "reject" | "reschedule" | "delete" | "replay") => {
    setWorkingId(id)
    try {
      if (action === "delete") {
        const response = await fetch(`/api/posts/${id}`, { method: "DELETE" })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || "Delete failed")
        toast.success("Post deleted from schedule")
        await load()
        return
      }

      if (action === "replay") {
        const response = await fetch(`/api/posts/${id}/review`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "replay" }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || "Replay failed")
        toast.success("Moved back to scheduled queue")
        await load()
        return
      }

      const body: Record<string, unknown> = { action }
      if (action === "reject") {
        body.reviewNotes = notesById[id] || "Needs revision"
      }
      if (action === "reschedule") {
        const value = manualScheduleById[id]
        if (!value) throw new Error("Select a date/time first")
        body.scheduledFor = new Date(value).getTime()
      }

      const response = await fetch(`/api/posts/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Action failed")

      toast.success(
        action === "approve" ? "Approved and scheduled" : action === "reject" ? "Rejected" : "Rescheduled",
      )
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed")
    } finally {
      setWorkingId(null)
    }
  }

  const askConfirmation = (id: string, action: "approve" | "reject" | "reschedule" | "delete" | "replay") => {
    setPendingAction({ id, action })
    setConfirmOpen(true)
  }

  const confirmAndRun = async () => {
    if (!pendingAction) return
    await reviewAction(pendingAction.id, pendingAction.action)
    setPendingAction(null)
    setConfirmOpen(false)
  }

  const persistOrder = async (orderedIds: string[]) => {
    const response = await fetch("/api/posts/review/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedPostIds: orderedIds }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || "Failed to reorder queue")
    }
  }

  const reorderScheduled = async (sourceId: string, targetId: string) => {
    const ordered = [...scheduledPosts]
    const from = ordered.findIndex((p) => p.id === sourceId)
    const to = ordered.findIndex((p) => p.id === targetId)
    if (from < 0 || to < 0 || from === to) return

    const [moved] = ordered.splice(from, 1)
    ordered.splice(to, 0, moved)

    const orderedIds = ordered.map((p) => p.id)
    setPosts((prev) => {
      const others = prev.filter((p) => p.workflow_status !== "scheduled")
      return [
        ...others,
        ...ordered.map((p, idx) => ({
          ...p,
          queue_position: idx + 1,
        })),
      ]
    })

    try {
      await persistOrder(orderedIds)
      toast.success("Schedule queue reordered")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder")
      await load()
    }
  }

  const generateWeeklyPosts = async () => {
    if (!weekPersonaId) {
      toast.error("Select a persona first")
      return
    }

    setIsGeneratingWeek(true)
    try {
      const response = await fetch("/api/posts/review/schedule-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: weekPersonaId,
          topic: weekTopic.trim() || undefined,
          targetPlatform: weekPlatform,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to generate weekly posts")

      toast.success(`Created ${data.created || 7} posts in pending review`)
      setScheduleWeekOpen(false)
      setWeekTopic("")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate weekly posts")
    } finally {
      setIsGeneratingWeek(false)
    }
  }

  return (
    <div className="space-y-3 p-1 sm:p-2 md:p-3">
      <PageHeader
        title="Review Queue"
        description="Approve pending drafts and prioritize scheduled posts."
        badgeText={`Pending: ${reviewPosts.length}`}
        rightSlot={
          <>
            <Badge variant="secondary">Scheduled: {scheduledPosts.length}</Badge>
            <Button variant="outline" className="bg-transparent" onClick={() => void load()} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => setScheduleWeekOpen(true)} disabled={personas.length === 0}>
              <Sparkles className="mr-2 h-4 w-4" />
              Schedule Week
            </Button>
          </>
        }
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Pending Review</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : reviewPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts waiting for review.</p>
          ) : (
            reviewPosts.map((post) => (
              <Card key={post.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{post.topic}</p>
                      <p className="text-xs text-muted-foreground">{post.personas?.name || "Persona"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{platformBadgeLabel(post.target_platform)}</Badge>
                      <Badge>{post.workflow_status || "review"}</Badge>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
                  <Textarea
                    placeholder="Optional rejection feedback"
                    value={notesById[post.id] || ""}
                    onChange={(e) => setNotesById((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    rows={2}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button className="w-full sm:w-auto" onClick={() => askConfirmation(post.id, "approve")} disabled={workingId === post.id}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve & Add to Queue
                    </Button>
                    <Button className="w-full sm:w-auto" variant="destructive" onClick={() => askConfirmation(post.id, "reject")} disabled={workingId === post.id}>
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Scheduled Queue (Drag to reorder)</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-2 rounded-md border px-2 py-1">
                <span className="text-xs text-muted-foreground">Auto Post</span>
                <Switch
                  checked={hasAnyChannelConnected ? connections.auto_post_enabled : false}
                  onCheckedChange={(checked) => void setAutoPost(checked)}
                  disabled={!hasAnyChannelConnected}
                />
              </div>
              {hasLinkedInScheduled && !connections.linkedin_connected && (
                <Badge variant="destructive">LinkedIn not connected</Badge>
              )}
              {hasXScheduled && !connections.x_connected && <Badge variant="destructive">X not connected</Badge>}
            </div>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : scheduledPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled posts yet.</p>
          ) : (
            scheduledPosts.map((post, index) => (
              <Card
                key={post.id}
                draggable
                className="cursor-pointer"
                onDragStart={() => setDraggingId(post.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault()
                  if (!draggingId || draggingId === post.id) return
                  await reorderScheduled(draggingId, post.id)
                  setDraggingId(null)
                }}
                onClick={(e) => handleScheduledCardClick(e, post)}
              >
                <CardContent className="space-y-3 p-4">
                  {(() => {
                    const activeTags = toPlatformTags(post.target_platform)
                    const canAddLinkedIn = !activeTags.includes("linkedin")
                    const canAddX = !activeTags.includes("x")
                    return (
                      <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{post.topic}</p>
                        <p className="text-xs text-muted-foreground">{post.personas?.name || "Persona"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary"><Clock3 className="mr-1 h-3.5 w-3.5" /> Scheduled</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          openPreview(post)
                        }}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeTags.map((tag) => (
                      <Badge key={tag} variant="outline" className="gap-1 pr-1">
                        {platformName(tag)}
                        <button
                          type="button"
                          className="ml-1 rounded px-1 text-xs hover:bg-muted"
                          onClick={() => {
                            const next = activeTags.filter((p) => p !== tag)
                            void updateScheduledTargets(post.id, next)
                          }}
                          disabled={workingId === post.id}
                          aria-label={`Remove ${platformName(tag)} target`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    {canAddLinkedIn && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => void updateScheduledTargets(post.id, [...activeTags, "linkedin"])}
                        disabled={workingId === post.id}
                      >
                        + LinkedIn
                      </Button>
                    )}
                    {canAddX && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => void updateScheduledTargets(post.id, [...activeTags, "x"])}
                        disabled={workingId === post.id}
                      >
                        + X
                      </Button>
                    )}
                  </div>
                  {(() => {
                    const tags = toPlatformTags(post.target_platform)
                    const linkedinRequired = tags.includes("linkedin")
                    const xRequired = tags.includes("x")
                    const readyForDate =
                      (!linkedinRequired || connections.linkedin_connected) &&
                      (!xRequired || connections.x_connected)

                    if (!readyForDate) {
                      return <div className="text-sm text-destructive">Connect required channel(s) to show schedule slot</div>
                    }

                    return (
                      <div className="text-sm text-muted-foreground">
                        Current slot: {post.scheduled_for ? new Date(post.scheduled_for).toLocaleString() : "Not set"}
                      </div>
                    )
                  })()}
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[220px] flex-1">
                      <label className="mb-1 block text-xs text-muted-foreground">Change schedule</label>
                      <Input
                        type="datetime-local"
                        value={manualScheduleById[post.id] || toDateTimeInputValue(post.scheduled_for)}
                        onChange={(e) => setManualScheduleById((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="bg-transparent"
                      onClick={() => askConfirmation(post.id, "reschedule")}
                      disabled={
                        workingId === post.id ||
                        (toPlatformTags(post.target_platform).includes("linkedin") && !connections.linkedin_connected) ||
                        (toPlatformTags(post.target_platform).includes("x") && !connections.x_connected)
                      }
                    >
                      <CalendarClock className="mr-2 h-4 w-4" /> Reschedule
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => askConfirmation(post.id, "delete")}
                      disabled={workingId === post.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Delivery Failures (Dead Letter)</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : deadLetterPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No failed deliveries.</p>
        ) : (
          deadLetterPosts.map((post) => (
            <Card key={post.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{post.topic}</p>
                    <p className="text-xs text-muted-foreground">{post.personas?.name || "Persona"}</p>
                  </div>
                  <Badge variant="destructive">Dead Letter</Badge>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{post.content}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">Attempts: {post.publish_attempt_count || 0}</Badge>
                  {post.publish_last_error ? <Badge variant="outline" className="max-w-full truncate">Error: {post.publish_last_error}</Badge> : null}
                </div>
                <Button onClick={() => askConfirmation(post.id, "replay")} disabled={workingId === post.id}>
                  Replay to Scheduled Queue
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <Dialog open={scheduleWeekOpen} onOpenChange={setScheduleWeekOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Week</DialogTitle>
            <DialogDescription>
              Generate 7 posts and send them to pending review. Topic is optional, and trend-based topics are used if empty.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Persona</Label>
              <Select value={weekPersonaId} onValueChange={setWeekPersonaId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select persona" />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic (optional)</Label>
              <Input
                placeholder="e.g. AI product strategy for founders"
                value={weekTopic}
                onChange={(e) => setWeekTopic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Target platform</Label>
              <Select value={weekPlatform} onValueChange={(value) => setWeekPlatform(value as "linkedin" | "x" | "both")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="x">X</SelectItem>
                  <SelectItem value="both">LinkedIn + X</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleWeekOpen(false)}>Cancel</Button>
            <Button onClick={generateWeeklyPosts} disabled={isGeneratingWeek || !weekPersonaId}>
              {isGeneratingWeek ? "Generating..." : "Generate 7 Posts"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewPost)} onOpenChange={(open) => !open && setPreviewPost(null)}>
        <DialogContent className="flex h-[min(90dvh,760px)] w-[95vw] max-w-2xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>{previewPost?.topic || "Post Preview"}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Badge variant="outline">{platformBadgeLabel(previewPost?.target_platform)}</Badge>
              <span>{previewPost?.personas?.name || "Persona"}</span>
            </DialogDescription>
          </DialogHeader>
          {previewPost && (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
              <div className="space-y-3">
              {(previewPost.target_platform === "linkedin" || previewPost.target_platform === "both" || !previewPost.target_platform) && (
                <QueueLinkedInPreview
                  name={previewPost.personas?.name || "Persona"}
                  title={previewPost.personas?.title}
                  content={previewPost.content}
                />
              )}
              {(previewPost.target_platform === "x" || previewPost.target_platform === "both") && (
                <QueueXPreview
                  name={previewPost.personas?.name || "Persona"}
                  content={previewPost.content}
                />
              )}
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
            <Button
              variant="outline"
              onClick={async () => {
                if (!previewPost?.content) return
                try {
                  await navigator.clipboard.writeText(previewPost.content)
                  toast.success("Post copied")
                } catch {
                  toast.error("Copy failed")
                }
              }}
            >
              Copy text
            </Button>
            <Button onClick={() => setPreviewPost(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm action</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === "approve" && "Approve this post and add it to the scheduled queue?"}
              {pendingAction?.action === "reject" && "Reject this post? It will not be posted."}
              {pendingAction?.action === "reschedule" && "Apply this new schedule time for the post?"}
              {pendingAction?.action === "delete" && "Delete this scheduled post permanently?"}
              {pendingAction?.action === "replay" && "Replay this failed post back to the scheduled queue?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAndRun} disabled={workingId !== null}>
              {workingId ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
