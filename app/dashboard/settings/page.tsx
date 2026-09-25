"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { connectLinkedIn, deleteAccount, disconnectLinkedIn, updateProfile } from "@/lib/mutations"
import { Cpu, Linkedin, Loader2, ShieldCheck, Trash2, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { profile, isLoading, refetch } = useProfile()

  const [fullName, setFullName] = useState("")
  const [defaultPublic, setDefaultPublic] = useState(false)
  const [showInExplore, setShowInExplore] = useState(true)
  const [autoPostEnabled, setAutoPostEnabled] = useState(false)
  const [timezone, setTimezone] = useState("UTC")
  const [postingSchedule, setPostingSchedule] = useState<Record<string, string>>({
    monday: "09:30",
    tuesday: "10:00",
    wednesday: "09:45",
    thursday: "10:15",
    friday: "09:30",
  })

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPrefs, setIsSavingPrefs] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLinkingLinkedIn, setIsLinkingLinkedIn] = useState(false)
  const [savingEngine, setSavingEngine] = useState<string | null>(null)
  const [testingEngine, setTestingEngine] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name || "")
    setDefaultPublic(Boolean(profile.default_persona_public))
    setShowInExplore(profile.allow_profile_in_explore !== false)
    setAutoPostEnabled(Boolean(profile.auto_post_enabled))
    if (profile.timezone) setTimezone(profile.timezone)
    if (profile.posting_schedule && typeof profile.posting_schedule === "object") {
      setPostingSchedule((prev) => ({ ...prev, ...(profile.posting_schedule as Record<string, string>) }))
    }
  }, [profile])

  useEffect(() => {
    if (searchParams.get("linkedin_success") === "true") {
      toast.success("LinkedIn connected")
      refetch()
    }
    if (searchParams.get("linkedin_error")) {
      toast.error(`LinkedIn connect failed: ${searchParams.get("linkedin_error")}`)
    }
  }, [searchParams, refetch])

  const connectionSummary = useMemo(() => {
    const channels = [profile?.linkedin_connected ? 1 : 0]
    return channels.reduce((a, b) => a + b, 0)
  }, [profile?.linkedin_connected])
  const canEnableAutoPost = Boolean(profile?.linkedin_connected)

  const handleSaveProfile = async () => {
    if (!user) return
    setIsSavingProfile(true)
    const result = await updateProfile(user.id, { full_name: fullName })
    if (result.success) {
      toast.success("Profile updated")
      await refetch()
    } else {
      toast.error(result.error || "Failed to update profile")
    }
    setIsSavingProfile(false)
  }

  const handleSavePrefs = async () => {
    if (!user) return
    setIsSavingPrefs(true)
    const result = await updateProfile(user.id, {
      default_persona_public: defaultPublic,
      allow_profile_in_explore: showInExplore,
      posting_schedule: postingSchedule,
      auto_post_enabled: canEnableAutoPost ? autoPostEnabled : false,
      timezone,
    })
    if (result.success) {
      toast.success("Preferences saved")
      await refetch()
    } else {
      toast.error(result.error || "Failed to save preferences")
    }
    setIsSavingPrefs(false)
  }

  const handleLinkedIn = async () => {
    setIsLinkingLinkedIn(true)
    if (profile?.linkedin_connected) {
      const result = await disconnectLinkedIn()
      if (result.success) {
        toast.success("LinkedIn disconnected")
        await refetch()
      } else {
        toast.error(result.error || "Failed to disconnect LinkedIn")
      }
      setIsLinkingLinkedIn(false)
      return
    }

    const result = await connectLinkedIn("/dashboard/settings")
    if (!result.success || !result.authUrl) {
      toast.error(result.error || "Failed to connect LinkedIn")
      setIsLinkingLinkedIn(false)
      return
    }

    window.location.href = result.authUrl
  }

  const handleSelectEngine = async (engineId: string) => {
    if (!user) return
    setSavingEngine(engineId)
    const result = await updateProfile(user.id, { ai_provider: engineId })
    if (result.success) toast.success("AI engine updated")
    else toast.error(result.error || "Failed to update AI engine")
    setSavingEngine(null)
  }

  const handleTestEngine = async (engineId: string) => {
    setTestingEngine(engineId)
    try {
      const response = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine: engineId }),
      })
      const data = await response.json().catch(() => ({}))
      if (data.ok) toast.success(`Connected (${data.model}, ${(data.ms / 1000).toFixed(1)}s)`)
      else toast.error(data.error || "Connection test failed")
    } catch {
      toast.error("Connection test failed")
    } finally {
      setTestingEngine(null)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    const result = await deleteAccount()
    if (result.success) {
      toast.success("Account deleted")
      router.replace("/auth/login")
    } else {
      toast.error(result.error || "Failed to delete account")
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-1 sm:p-2 md:p-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-3 p-1 sm:p-2 md:p-3">
      <PageHeader
        title="Settings"
        description="Connections, AI engine, profile, and automation defaults."
        rightSlot={<Badge variant="secondary">Channels: {connectionSummary}/1</Badge>}
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <Card id="linkedin" className="scroll-mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Linkedin className="h-5 w-5 text-[#0A66C2]" />LinkedIn</CardTitle>
            <CardDescription>Publishing, scheduling, and post analytics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex min-w-0 items-center gap-2 font-medium">
                {profile?.linkedin_profile_image_url ? (
                  <img
                    src={profile.linkedin_profile_image_url}
                    alt="LinkedIn profile"
                    className="h-8 w-8 rounded-full border object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Linkedin className="h-5 w-5 text-[#0A66C2]" />
                )}
                <span className="truncate">{profile?.linkedin_connected ? "Your LinkedIn account" : "No account connected"}</span>
              </div>
              <Badge variant={profile?.linkedin_connected ? "default" : "secondary"}>{profile?.linkedin_connected ? "Connected" : "Not connected"}</Badge>
            </div>
            {profile?.linkedin_token_warning ? (
              <p className={`text-xs ${profile.linkedin_needs_reconnect ? "text-destructive" : "text-amber-300"}`}>
                {profile.linkedin_token_warning}
              </p>
            ) : null}
            <div className="flex gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              <p>
                You sign in on LinkedIn&apos;s own page with your email and password. PersonaPost never sees or stores your
                password; it gets a revocable token that can only post for you and read your posts&apos; stats.
              </p>
            </div>
            <Button onClick={handleLinkedIn} disabled={isLinkingLinkedIn} className="w-full" variant={profile?.linkedin_connected ? "outline" : "default"}>
              {isLinkingLinkedIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {profile?.linkedin_connected ? "Disconnect LinkedIn" : "Sign in with LinkedIn"}
            </Button>
          </CardContent>
        </Card>

        <Card id="ai" className="scroll-mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" />AI Engine</CardTitle>
            <CardDescription>
              Use the Claude or ChatGPT subscription you already pay for. Local engines are free here; they run the CLI on
              this machine, so log in once with <code className="metric-mono">claude</code> or <code className="metric-mono">codex login</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(profile?.ai_engines ?? []).map((engine) => {
              const active = profile?.ai_engine === engine.id
              return (
                <div
                  key={engine.id}
                  className={cn("rounded-lg border p-3", active ? "border-primary/50 bg-primary/10" : engine.available ? "" : "opacity-60")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {engine.label}
                        {engine.local ? <Badge variant="outline" className="text-[10px]">Free</Badge> : null}
                        {active ? <Badge className="text-[10px]">Active</Badge> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{engine.detail}</p>
                    </div>
                    <span className={cn("shrink-0 text-xs", engine.available ? "text-emerald-300" : "text-muted-foreground")}>
                      {engine.available ? "Detected" : engine.local ? "Not installed" : "No key"}
                    </span>
                  </div>
                  {engine.available ? (
                    <div className="mt-2 flex gap-2">
                      {!active ? (
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleSelectEngine(engine.id)} disabled={savingEngine !== null}>
                          {savingEngine === engine.id && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                          Use {engine.label}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" className="h-7 bg-transparent text-xs" onClick={() => handleTestEngine(engine.id)} disabled={testingEngine !== null}>
                        {testingEngine === engine.id && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                        Test connection
                      </Button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary" />Profile</CardTitle>
            <CardDescription>Account info.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
            </div>
            <Button className="w-full sm:w-auto" onClick={handleSaveProfile} disabled={isSavingProfile}>
              {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Coins.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl sm:text-3xl font-bold">{profile?.coins || 0}</p>
            <p className="text-sm text-muted-foreground">Current coin balance</p>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/dashboard/coins">Buy coins</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card id="schedule" className="scroll-mt-4">
        <CardHeader>
          <CardTitle>Automation + Scheduling</CardTitle>
          <CardDescription>Auto-publish, posting times, and persona visibility.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Public by default</p>
                <p className="text-xs text-muted-foreground">New personas are automatically public.</p>
              </div>
              <Switch checked={defaultPublic} onCheckedChange={setDefaultPublic} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Show in explore</p>
                <p className="text-xs text-muted-foreground">Let community users discover your profile/personas.</p>
              </div>
              <Switch checked={showInExplore} onCheckedChange={setShowInExplore} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Automatic post</p>
                <p className="text-xs text-muted-foreground">
                  Auto-publish scheduled queue when due.
                  {!canEnableAutoPost ? " Connect LinkedIn first." : ""}
                </p>
              </div>
              <Switch checked={canEnableAutoPost ? autoPostEnabled : false} onCheckedChange={setAutoPostEnabled} disabled={!canEnableAutoPost} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="UTC" />
            </div>

            {(["monday", "tuesday", "wednesday", "thursday", "friday"] as const).map((day) => (
              <div key={day} className="space-y-2">
                <Label htmlFor={`schedule-${day}`}>{day.slice(0, 1).toUpperCase() + day.slice(1)}</Label>
                <Input
                  id={`schedule-${day}`}
                  type="time"
                  value={postingSchedule[day] || "09:30"}
                  onChange={(e) => setPostingSchedule((prev) => ({ ...prev, [day]: e.target.value || "09:30" }))}
                />
              </div>
            ))}
          </div>
          <Button onClick={handleSavePrefs} disabled={isSavingPrefs} className="w-full sm:w-auto">
            {isSavingPrefs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save automation settings
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" />Danger Zone</CardTitle>
          <CardDescription>Deleting your account permanently removes personas, posts, and transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is irreversible. Your posts, personas, coins history, and account data will be removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
