"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
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

interface Avatar {
  id: string
  name: string
  title: string | null
  personality: string
  writing_style: string
  avatar_url: string | null
}

export function AvatarCard({ avatar }: { avatar: Avatar }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from("avatars").delete().eq("id", avatar.id)

    if (!error) {
      router.refresh()
      setShowDeleteDialog(false)
    }
    setIsDeleting(false)
  }

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:border-primary/50">
        <div className="flex flex-1 flex-col p-6">
          {/* Avatar Image */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {avatar.avatar_url ? (
              <img
                src={avatar.avatar_url || "/placeholder.svg"}
                alt={avatar.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-primary">{avatar.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Avatar Info */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{avatar.name}</h3>
            {avatar.title && <p className="mt-1 text-sm text-muted-foreground">{avatar.title}</p>}
            <div className="mt-4 space-y-2">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Personality:</span> {avatar.personality}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Style:</span> {avatar.writing_style}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-2">
            <Button asChild size="sm" className="flex-1">
              <Link href={`/dashboard/generate?avatar=${avatar.id}`}>Generate Post</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="bg-transparent">
              <Link href={`/dashboard/avatars/${avatar.id}/edit`}>Edit</Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDeleteDialog(true)}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Avatar</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {avatar.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
