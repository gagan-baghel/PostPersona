'use client'

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { usePosts } from "@/hooks/use-posts"
import { useProfile } from "@/hooks/use-profile"
import { usePersonas } from "@/hooks/use-personas"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { AlertCircle, BarChart3, CalendarDays, CheckCircle2, Clock3, Coins, History, Linkedin, PenSquare, Play, Settings, Sparkles, Twitter } from "lucide-react"

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { posts, isLoading: postsLoading } = usePosts()
  const { profile, isLoading: profileLoading } = useProfile()
  const { personas, isLoading: personasLoading } = usePersonas()
  const [isRunningPublisher, setIsRunningPublisher] = useState(false)

  if (postsLoading || profileLoading || personasLoading) {
    return <DashboardSkeleton />
  }

  const ownedPersonas = personas.filter((p: any) => String(p.user_id || "") === String(user?.id || ""))
  const pending = posts.filter((p: any) => (p.workflow_status ?? "draft") === "review")
  const scheduled = posts
    .filter((p: any) => (p.workflow_status ?? "draft") === "scheduled")
    .sort((a: any, b: any) => {
      const aq = isNumber(a.queue_position) ? a.queue_position : Number.MAX_SAFE_INTEGER
      const bq = isNumber(b.queue_position) ? b.queue_position : Number.MAX_SAFE_INTEGER
      if (aq !== bq) return aq - bq
      return (a.scheduled_for ?? 0) - (b.scheduled_for ?? 0)
    })
  const posted = posts.filter((p: any) => (p.workflow_status ?? "draft") === "posted")

  const nextQueued = scheduled.slice(0, 5)
  const firstName = profile?.full_name?.trim()?.split(" ")?.[0] || "Creator"
  const blockers: string[] = []
  if (!profile?.linkedin_connected) blockers.push("Connect LinkedIn account")
  if (profile?.linkedin_needs_reconnect) blockers.push("Reconnect LinkedIn (token lifecycle)")
  if (!profile?.auto_post_enabled) blockers.push("Turn on Automatic post")
  if (ownedPersonas.length === 0) blockers.push("Create at least one custom persona")
  if (scheduled.length === 0) blockers.push("Approve posts into schedule queue")
  const readinessScore = Math.max(0, 100 - blockers.length * 25)

  const runPublisherNow = async () => {
    setIsRunningPublisher(true)
    try {
      const response = await fetch("/api/posts/process-queue", { method: "POST" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to run publisher")
      if (data.processed > 0) {
        toast.success("Queue processor posted the next scheduled item")
      } else {
        const reason = typeof data.reason === "string" ? data.reason.replaceAll("_", " ") : "Nothing due yet"
        toast.message(`No post published: ${reason}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run publisher")
    } finally {
      setIsRunningPublisher(false)
    }
  }

  return (
    <div className="space-y-4 p-1 sm:p-2 md:p-3">
      <Card className="bg-gradient-to-br from-primary/15 via-background to-cyan-500/10">
        <CardHeader className="p-4 sm:p-5">
          <CardTitle className="text-xl sm:text-2xl">{firstName}, this is your LinkedIn Autopilot</CardTitle>
          <CardDescription>
            {"End-to-end flow: generate -> approve -> schedule -> auto-publish -> analyze."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row p-4 pt-0 sm:p-5 sm:pt-0">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/generate">
              <PenSquare className="mr-2 h-4 w-4" />
              Open Studio
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto bg-transparent">
            <Link href="/dashboard/review">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Open Review Queue
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto bg-transparent">
            <Link href="/dashboard/calendar">
              <CalendarDays className="mr-2 h-4 w-4" />
              Open Calendar
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto bg-transparent">
            <Link href="/dashboard/profile-analysis">
              <BarChart3 className="mr-2 h-4 w-4" />
              Profile Analysis
            </Link>
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2 p-4">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Automation Readiness
            </CardTitle>
            <CardDescription>Keep this at 100% for fully hands-off LinkedIn execution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Readiness Score</p>
              <Badge variant={readinessScore >= 75 ? "default" : "secondary"}>{readinessScore}%</Badge>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${readinessScore}%` }} />
            </div>
            {blockers.length === 0 ? (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                Autopilot is fully configured.
              </div>
            ) : (
              <div className="space-y-2">
                {blockers.map((blocker, idx) => (
                  <div key={`blocker-${idx}`} className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-300" />
                    <span>{blocker}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle>Autopilot Controls</CardTitle>
            <CardDescription>High-leverage actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            <Button asChild className="w-full justify-start">
              <Link href="/dashboard/review?scheduleWeek=1">
                <Sparkles className="mr-2 h-4 w-4" />
                Schedule LinkedIn Week
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent" onClick={runPublisherNow} disabled={isRunningPublisher}>
              <Play className="mr-2 h-4 w-4" />
              {isRunningPublisher ? "Running publisher..." : "Run Publisher Now"}
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Open Automation Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl">{pending.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-muted-foreground">Needs your approval before any posting.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-4">
            <CardDescription>Scheduled Queue</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl">{scheduled.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-muted-foreground">Top queue item publishes first.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-4">
            <CardDescription>Published (LinkedIn)</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl">{posted.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-muted-foreground">Live completed posts and archive-ready history.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-4">
            <CardDescription>Credits</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl">{profile?.coins ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-muted-foreground">{(profile?.coins ?? 0) < 10 ? "Low credits, consider topping up." : "Healthy credit balance."}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              Next in Queue
            </CardTitle>
            <CardDescription>These are the next posts to be published, in exact order.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {nextQueued.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                Queue is empty. Approve drafts in Review Queue to start scheduling.
              </div>
            ) : (
              <div className="space-y-3">
                {nextQueued.map((post: any, index: number) => (
                  <div key={post.id} className="rounded-lg border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <p className="font-medium line-clamp-1">{post.topic}</p>
                      </div>
                      <Badge variant="outline">
                        {post.target_platform === "x" ? "X" : post.target_platform === "both" ? "LinkedIn + X" : "LinkedIn"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {post.scheduled_for ? `Scheduled: ${new Date(post.scheduled_for).toLocaleString()}` : "Time will be auto-assigned"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle>Account Health</CardTitle>
            <CardDescription>LinkedIn automation status and quick tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant={profile?.linkedin_connected ? "default" : "secondary"}>
                <Linkedin className="mr-1 h-3.5 w-3.5" /> LinkedIn
              </Badge>
              <Badge variant={profile?.x_connected ? "default" : "secondary"}>
                <Twitter className="mr-1 h-3.5 w-3.5" /> X
              </Badge>
            </div>

            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                <Link href="/dashboard/personas">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Manage Personas
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                <Link href="/dashboard/history">
                  <History className="mr-2 h-4 w-4" />
                  View History
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                <Link href="/dashboard/coins">
                  <Coins className="mr-2 h-4 w-4" />
                  Manage Credits
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Posting Settings
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                <Link href="/dashboard/profile-analysis">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analyze LinkedIn Performance
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
