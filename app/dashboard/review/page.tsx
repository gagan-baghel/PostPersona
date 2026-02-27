'use client'

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { CalendarClock, CheckCircle2, Clock3, GripVertical, RefreshCw, Trash2, XCircle } from "lucide-react"

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

interface UserConnections {
  linkedin_connected: boolean
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

export default function ReviewPage() {
  const [posts, setPosts] = useState<ReviewPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [manualScheduleById, setManualScheduleById] = useState<Record<string, string>>({})
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "approve" | "reject" | "reschedule" | "delete" | "replay" } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [previewPost, setPreviewPost] = useState<ReviewPost | null>(null)
  const [connections, setConnections] = useState<UserConnections>({
    linkedin_connected: false,
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
      const [reviewResponse, userResponse] = await Promise.all([
        fetch("/api/posts/review"),
        fetch("/api/user"),
      ])

      const [reviewData, userData] = await Promise.all([
        reviewResponse.json().catch(() => []),
        userResponse.json().catch(() => ({})),
      ])

      if (!reviewResponse.ok) throw new Error(reviewData.error || "Failed to load review posts")
      if (!userResponse.ok) throw new Error(userData.error || "Failed to load account status")

      setPosts(Array.isArray(reviewData) ? reviewData : [])

      setConnections({
        linkedin_connected: Boolean(userData.linkedin_connected),
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

  const openPreview = (post: ReviewPost) => setPreviewPost(post)

  const handleScheduledCardClick = (event: MouseEvent, post: ReviewPost) => {
    const target = event.target as HTMLElement
    if (target.closest("button,input,textarea,select,label,[role='switch']")) return
    openPreview(post)
  }

  const hasLinkedInScheduled = useMemo(
    () => scheduledPosts.some((post) => (post.target_platform || "linkedin") === "linkedin"),
    [scheduledPosts],
  )

  const setAutoPost = async (enabled: boolean) => {
    const next = enabled && connections.linkedin_connected
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
                      <Badge variant="outline">LinkedIn</Badge>
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
                  checked={connections.linkedin_connected ? connections.auto_post_enabled : false}
                  onCheckedChange={(checked) => void setAutoPost(checked)}
                  disabled={!connections.linkedin_connected}
                />
              </div>
              {hasLinkedInScheduled && !connections.linkedin_connected && (
                <Badge variant="destructive">LinkedIn not connected</Badge>
              )}
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
                className={cn(
                  "cursor-pointer",
                  draggingId === post.id && "border-primary/45 opacity-80 shadow-[0_0_0_1px_rgba(59,130,246,0.45)]",
                  dropTargetId === post.id && "border-primary/60 shadow-[0_0_0_1px_rgba(59,130,246,0.6)]",
                )}
                onDragStart={() => setDraggingId(post.id)}
                onDragEnter={() => setDropTargetId(post.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault()
                  if (!draggingId || draggingId === post.id) return
                  await reorderScheduled(draggingId, post.id)
                  setDraggingId(null)
                  setDropTargetId(null)
                }}
                onDragEnd={() => {
                  setDraggingId(null)
                  setDropTargetId(null)
                }}
                onClick={(e) => handleScheduledCardClick(e, post)}
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary" className="metric-mono">#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{post.topic}</p>
                        <p className="text-xs text-muted-foreground">{post.personas?.name || "Persona"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={cn("metric-mono", post.publish_next_retry_at ? "status-pulse border-amber-400/55 text-amber-200" : undefined)}>
                        <Clock3 className="mr-1 h-3.5 w-3.5" /> {post.publish_next_retry_at ? "Retrying" : "Scheduled"}
                      </Badge>
                      <Badge variant="outline">LinkedIn</Badge>
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
                  <div className="metric-mono text-xs text-muted-foreground">
                    Current slot: {post.scheduled_for ? new Date(post.scheduled_for).toLocaleString() : "Not set"}
                  </div>
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
                      disabled={workingId === post.id || !connections.linkedin_connected}
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
                  <Badge variant="destructive" className="status-pulse">Dead Letter</Badge>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{post.content}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary" className="metric-mono">Attempts: {post.publish_attempt_count || 0}</Badge>
                  {post.publish_last_error ? <Badge variant="outline" className="max-w-full truncate metric-mono">Error: {post.publish_last_error}</Badge> : null}
                </div>
                <Button onClick={() => askConfirmation(post.id, "replay")} disabled={workingId === post.id}>
                  Replay to Scheduled Queue
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <Dialog open={Boolean(previewPost)} onOpenChange={(open) => !open && setPreviewPost(null)}>
        <DialogContent className="flex h-[min(90dvh,760px)] w-[95vw] max-w-2xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>{previewPost?.topic || "Post Preview"}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Badge variant="outline">LinkedIn</Badge>
              <span>{previewPost?.personas?.name || "Persona"}</span>
            </DialogDescription>
          </DialogHeader>
          {previewPost && (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
              <QueueLinkedInPreview
                name={previewPost.personas?.name || "Persona"}
                title={previewPost.personas?.title}
                content={previewPost.content}
              />
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
