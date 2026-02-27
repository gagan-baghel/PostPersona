"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { usePersonas } from "@/hooks/use-personas"
import { usePosts } from "@/hooks/use-posts"
import { useProfile } from "@/hooks/use-profile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ReadinessIndicator() {
  const { user } = useAuth()
  const { posts } = usePosts()
  const { profile } = useProfile()
  const { personas } = usePersonas()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const readiness = useMemo(() => {
    const ownedPersonas = personas.filter((p: any) => String(p.user_id || "") === String(user?.id || ""))
    const scheduled = posts.filter((p: any) => (p.workflow_status ?? "draft") === "scheduled")
    const blockers: string[] = []
    if (!profile?.linkedin_connected) blockers.push("Connect LinkedIn")
    if (profile?.linkedin_needs_reconnect) blockers.push("Reconnect LinkedIn")
    if (!profile?.auto_post_enabled) blockers.push("Turn on auto-post")
    if (ownedPersonas.length === 0) blockers.push("Create a persona")
    if (scheduled.length === 0) blockers.push("Queue approved posts")
    const score = Math.max(0, 100 - blockers.length * 25)
    return { score, blockers }
  }, [personas, posts, profile?.auto_post_enabled, profile?.linkedin_connected, profile?.linkedin_needs_reconnect, user?.id])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!open) return
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Automation readiness ${readiness.score}%`}
        onClick={() => setOpen((v) => !v)}
        className="group flex h-9 w-9 items-center justify-center rounded-full border border-primary/35 bg-background/70"
        style={{
          backgroundImage: `conic-gradient(from 270deg, var(--color-primary) ${readiness.score}%, color-mix(in oklab, var(--color-muted) 85%, transparent) ${readiness.score}% 100%)`,
        }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background text-[10px] font-semibold metric-mono">
          {readiness.score}
        </span>
      </button>

      {open ? (
        <div className="ui-glass absolute right-0 top-[calc(100%+0.45rem)] z-40 w-[min(90vw,280px)] rounded-lg border p-3 shadow-[0_25px_50px_-34px_rgba(59,130,246,0.72)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium">Automation Readiness</p>
            <Badge variant={readiness.score >= 75 ? "default" : "secondary"} className="metric-mono">
              {readiness.score}%
            </Badge>
          </div>

          {readiness.blockers.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-400/35 bg-emerald-500/12 px-2 py-1.5 text-xs text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ready to auto-publish.
            </div>
          ) : (
            <div className="space-y-1.5">
              {readiness.blockers.map((blocker) => (
                <div key={blocker} className="flex items-center gap-2 rounded-md border border-amber-400/35 bg-amber-500/12 px-2 py-1.5 text-xs text-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{blocker}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2">
            <Button asChild variant="outline" size="sm" className="h-7 w-full bg-transparent text-xs">
              <Link href="/dashboard/settings">Open settings</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
