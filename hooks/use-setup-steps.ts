'use client'

import { useMemo } from "react"

import { useAuth } from "./use-auth"
import { usePersonas } from "./use-personas"
import { usePosts } from "./use-posts"
import { useProfile } from "./use-profile"

export type SetupStep = { id: string; label: string; hint: string; href: string; done: boolean }

/** The onboarding path to a hands-off LinkedIn: shared by the header ring and the overview checklist. */
export function useSetupSteps() {
  const { user } = useAuth()
  const { posts } = usePosts()
  const { profile } = useProfile()
  const { personas } = usePersonas()

  return useMemo(() => {
    const ownsPersona = personas.some((p) => String(p.user_id || "") === String(user?.id || ""))
    const hasQueued = posts.some((p: any) => ["scheduled", "posted"].includes(p.workflow_status ?? "draft"))
    const linkedInOk = Boolean(profile?.linkedin_connected) && !profile?.linkedin_needs_reconnect

    const steps: SetupStep[] = [
      {
        id: "linkedin",
        label: profile?.linkedin_needs_reconnect ? "Reconnect LinkedIn" : "Connect LinkedIn",
        hint: "Official LinkedIn sign-in. Your password never touches PersonaPost.",
        href: "/dashboard/settings#linkedin",
        done: linkedInOk,
      },
      {
        id: "ai",
        label: "Pick an AI engine",
        hint: "Use your Claude Code or Codex subscription for free drafts.",
        href: "/dashboard/settings#ai",
        done: Boolean(profile?.ai_engine),
      },
      {
        id: "persona",
        label: "Teach it your voice",
        hint: "Create a persona from a few of your best posts.",
        href: "/dashboard/personas/new",
        done: ownsPersona,
      },
      {
        id: "queue",
        label: "Queue your first post",
        hint: "Generate, review, and add it to the schedule.",
        href: "/dashboard/generate",
        done: hasQueued,
      },
      {
        id: "autopost",
        label: "Turn on auto-publish",
        hint: "Approved posts go live at your preferred times.",
        href: "/dashboard/settings#schedule",
        done: Boolean(profile?.auto_post_enabled),
      },
    ]

    const doneCount = steps.filter((s) => s.done).length
    return { steps, doneCount, score: Math.round((doneCount / steps.length) * 100) }
  }, [personas, posts, profile, user?.id])
}
