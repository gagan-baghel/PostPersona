"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { useSetupSteps } from "@/hooks/use-setup-steps"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function ReadinessIndicator() {
  const { steps, score } = useSetupSteps()
  const readiness = { score, blockers: steps.filter((s) => !s.done) }
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

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
        aria-label={`Setup ${readiness.score}% complete`}
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
            <p className="text-xs font-medium">Setup progress</p>
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
              {readiness.blockers.map((step) => (
                <Link
                  key={step.id}
                  href={step.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md border border-amber-400/35 bg-amber-500/12 px-2 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{step.label}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-2">
            <Button asChild variant="outline" size="sm" className="h-7 w-full bg-transparent text-xs">
              <Link href="/dashboard" onClick={() => setOpen(false)}>Open checklist</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
