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
import { connectLinkedIn, connectX, deleteAccount, disconnectLinkedIn, disconnectX, updateProfile } from "@/lib/mutations"
import { Linkedin, Loader2, Settings2, Trash2, UserRound, X } from "lucide-react"
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
  const [isLinkingX, setIsLinkingX] = useState(false)

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name || "")
    setDefaultPublic(Boolean(profile.default_persona_public))
    setShowInExplore(profile.allow_profile_in_explore !== false)
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
    if (searchParams.get("x_success") === "true") {
      toast.success("X connected")
      refetch()
    }
    if (searchParams.get("linkedin_error")) {
      toast.error(`LinkedIn connect failed: ${searchParams.get("linkedin_error")}`)
    }
    if (searchParams.get("x_error")) {
      toast.error(`X connect failed: ${searchParams.get("x_error")}`)
    }
  }, [searchParams, refetch])

  const connectionSummary = useMemo(() => {
    const channels = [profile?.linkedin_connected ? 1 : 0, profile?.x_connected ? 1 : 0]
    return channels.reduce((a, b) => a + b, 0)
  }, [profile?.linkedin_connected, profile?.x_connected])

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

  const handleX = async () => {
    setIsLinkingX(true)
    if (profile?.x_connected) {
      const result = await disconnectX()
      if (result.success) {
        toast.success("X disconnected")
        await refetch()
      } else {
        toast.error(result.error || "Failed to disconnect X")
      }
      setIsLinkingX(false)
      return
    }

    const result = await connectX("/dashboard/settings")
    if (!result.success || !result.authUrl) {
      toast.error(result.error || "Failed to connect X")
      setIsLinkingX(false)
      return
    }

    window.location.href = result.authUrl
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
      <div className="space-y-6 p-2 sm:p-4 md:p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-2 sm:p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Settings2 className="h-5 w-5 text-primary" />Settings</h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Channels: {connectionSummary}/2</Badge>
          <Badge variant="secondary">Coins: {profile?.coins || 0}</Badge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
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
            <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
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
            <p className="text-3xl font-bold">{profile?.coins || 0}</p>
            <p className="text-sm text-muted-foreground">Current coin balance</p>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/dashboard/coins">Buy coins</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Social Channels</CardTitle>
            <CardDescription>Connect LinkedIn and X.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium"><Linkedin className="h-4 w-4 text-[#0A66C2]" /> LinkedIn</div>
                <Badge variant={profile?.linkedin_connected ? "default" : "secondary"}>{profile?.linkedin_connected ? "Connected" : "Not connected"}</Badge>
              </div>
              <Button onClick={handleLinkedIn} disabled={isLinkingLinkedIn} className="w-full">
                {isLinkingLinkedIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {profile?.linkedin_connected ? "Disconnect LinkedIn" : "Connect LinkedIn"}
              </Button>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium"><X className="h-4 w-4" /> X</div>
                <Badge variant={profile?.x_connected ? "default" : "secondary"}>{profile?.x_connected ? "Connected" : "Not connected"}</Badge>
              </div>
              {profile?.x_username && <p className="mb-4 text-xs text-muted-foreground">Connected as @{profile.x_username}</p>}
              {!profile?.x_username && <div className="mb-4" />}
              <Button onClick={handleX} disabled={isLinkingX} className="w-full" variant="secondary">
                {isLinkingX && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {profile?.x_connected ? "Disconnect X" : "Connect X"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Persona + Scheduling Defaults</CardTitle>
            <CardDescription>Default visibility and weekday times.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
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

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="UTC" />
            </div>

            {(["monday", "tuesday", "wednesday", "thursday", "friday"] as const).map((day) => (
              <div key={day} className="space-y-2">
                <Label htmlFor={`schedule-${day}`}>Default {day.slice(0, 1).toUpperCase() + day.slice(1)} time</Label>
                <Input
                  id={`schedule-${day}`}
                  type="time"
                  value={postingSchedule[day] || "09:30"}
                  onChange={(e) => setPostingSchedule((prev) => ({ ...prev, [day]: e.target.value || "09:30" }))}
                />
              </div>
            ))}
            <Button onClick={handleSavePrefs} disabled={isSavingPrefs} className="w-full">
              {isSavingPrefs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save defaults
            </Button>
          </CardContent>
        </Card>
      </div>

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
