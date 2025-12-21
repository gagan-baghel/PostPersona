"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useProfile } from "@/hooks/use-profile"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { updateProfile, deleteAccount } from "@/lib/mutations"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
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
  const { profile, isLoading, refetch } = useProfile()
  const { user } = useAuth()
  const router = useRouter()

  // Settings State
  const [fullName, setFullName] = useState("")
  const [defaultPublic, setDefaultPublic] = useState(false)
  const [showInExplore, setShowInExplore] = useState(true)

  // Loading States
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load initial data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "")
      // Load potential future preferences from profile if implemented
    }
  }, [profile])

  const handleSaveProfile = async () => {
    if (!profile) return
    setIsSaving(true)

    try {
      const result = await updateProfile(profile.id, { full_name: fullName })

      if (result.success) {
        toast.success("Profile updated successfully")
        refetch()
      } else {
        toast.error(result.error || "Failed to update profile")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePreferences = async () => {
    // Simulating preference save for now as requested
    // In real app, this would use updateProfile with a metadata column
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 600))
    toast.success("Preferences saved (Simulation)")
    setIsSaving(false)
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteAccount()
      if (result.success) {
        toast.success("Account deleted successfully")
        router.replace("/auth/login")
      } else {
        toast.error(result.error || "Failed to delete account")
        setIsDeleting(false)
      }
    } catch (error) {
      toast.error("An error occurred during deletion")
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-2xl space-y-8">
          <Skeleton className="h-10 w-48 mb-4" />
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-2 text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-8">

          {/* Profile Information */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Your email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>

              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Account Overview */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Account Information</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Account ID</Label>
                <p className="font-mono text-xs mt-1 bg-muted p-2 rounded truncate">{profile?.id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Coin Balance</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-primary">{profile?.coins || 0}</span>
                </div>
              </div>

              <div className="col-span-full">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/coins">Get More Coins</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Persona Preferences (Visual only for now per strict request to match UI, functioning logic can be added later) */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Persona Preferences</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">New personas public by default</Label>
                  <p className="text-sm text-muted-foreground">New personas will be visible in Explore immediately</p>
                </div>
                <Switch checked={defaultPublic} onCheckedChange={setDefaultPublic} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Show in Explore</Label>
                  <p className="text-sm text-muted-foreground">Allow others to discover your published personas</p>
                </div>
                <Switch checked={showInExplore} onCheckedChange={setShowInExplore} />
              </div>
              <Button onClick={handleSavePreferences} variant="secondary" disabled={isSaving}>
                Save Preferences
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:bg-red-950/20 dark:border-red-900">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-6">
              Once you delete your account, there is no going back. Please be certain.
            </p>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isDeleting ? "Deleting..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

        </div>
      </div>
    </div>
  )
}
