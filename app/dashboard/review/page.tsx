'use client'

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import { toast } from "sonner"
import { CalendarClock, CheckCircle2, Clock3, GripVertical, Sparkles, Trash2, XCircle } from "lucide-react"

interface ReviewPost {
  id: string
  topic: string
  content: string
  workflow_status?: string
  target_platform?: string
  queue_position?: number | null
  scheduled_for?: number | null
  review_notes?: string | null
  personas: { name: string; title: string | null } | null
}

interface PersonaOption {
  id: string
  name: string
}

function toDateTimeInputValue(ts?: number | null) {
  if (!ts) return ""
  const d = new Date(ts)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
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
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "approve" | "reject" | "reschedule" | "delete" } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [scheduleWeekOpen, setScheduleWeekOpen] = useState(false)
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false)
  const [weekPersonaId, setWeekPersonaId] = useState("")
  const [weekTopic, setWeekTopic] = useState("")
  const [weekPlatform, setWeekPlatform] = useState<"linkedin" | "x" | "both">("linkedin")

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

  const load = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/posts/review")
      const data = await response.json().catch(() => [])
      if (!response.ok) throw new Error(data.error || "Failed to load review posts")
      setPosts(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load")
    } finally {
      setIsLoading(false)
    }
  }

  const loadPersonas = async () => {
    try {
      const response = await fetch("/api/personas")
      const data = await response.json().catch(() => [])
      if (!response.ok) throw new Error(data.error || "Failed to load personas")
      const options = Array.isArray(data)
        ? data.map((p: any) => ({ id: String(p.id), name: String(p.name || "Untitled Persona") }))
        : []
      setPersonas(options)
      setWeekPersonaId((prev) => prev || options[0]?.id || "")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load personas")
    }
  }

  useEffect(() => {
    load()
    loadPersonas()
  }, [])

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

  const reviewAction = async (id: string, action: "approve" | "reject" | "reschedule" | "delete") => {
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

  const askConfirmation = (id: string, action: "approve" | "reject" | "reschedule" | "delete") => {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Review Queue</h1>
          <Badge variant="secondary">Pending: {reviewPosts.length}</Badge>
          <Badge variant="secondary">Scheduled: {scheduledPosts.length}</Badge>
        </div>
        <Button onClick={() => setScheduleWeekOpen(true)} disabled={personas.length === 0}>
          <Sparkles className="mr-2 h-4 w-4" />
          Schedule Week
        </Button>
      </div>

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
          <h2 className="text-lg font-semibold">Scheduled Queue (Drag to reorder)</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : scheduledPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled posts yet.</p>
          ) : (
            scheduledPosts.map((post, index) => (
              <Card
                key={post.id}
                draggable
                onDragStart={() => setDraggingId(post.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault()
                  if (!draggingId || draggingId === post.id) return
                  await reorderScheduled(draggingId, post.id)
                  setDraggingId(null)
                }}
              >
                <CardContent className="space-y-3 p-4">
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
                      <Badge variant="outline">{platformBadgeLabel(post.target_platform)}</Badge>
                      <Badge variant="secondary"><Clock3 className="mr-1 h-3.5 w-3.5" /> Scheduled</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
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
                    <Button variant="outline" className="bg-transparent" onClick={() => askConfirmation(post.id, "reschedule")} disabled={workingId === post.id}>
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm action</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === "approve" && "Approve this post and add it to the scheduled queue?"}
              {pendingAction?.action === "reject" && "Reject this post? It will not be posted."}
              {pendingAction?.action === "reschedule" && "Apply this new schedule time for the post?"}
              {pendingAction?.action === "delete" && "Delete this scheduled post permanently?"}
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
