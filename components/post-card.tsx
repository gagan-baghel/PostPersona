"use client"

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

interface Post {
  id: string
  topic: string
  content: string
  created_at: string
  image_url: string | null
  image_preset: string | null
  posted_to_linkedin: boolean
  personas: {
    id: string
    name: string
    title: string | null
    avatar_url: string | null
  } | null
}

export function PostCard({ post }: { post: Post }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from("posts").delete().eq("id", post.id)

    if (!error) {
      router.refresh()
      setShowDeleteDialog(false)
    } else {
      console.error("[v0] Error deleting post:", error)
    }
    setIsDeleting(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(post.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formattedDate = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const shouldTruncate = post.content.length > 300
  const displayContent = expanded || !shouldTruncate ? post.content : `${post.content.slice(0, 300)}...`

  return (
    <>
      <div className="rounded-lg border bg-card p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            {post.personas ? (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                {post.personas.avatar_url ? (
                  <img
                    src={post.personas.avatar_url || "/placeholder.svg"}
                    alt={post.personas.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-primary">{post.personas.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {post.personas?.name || "Deleted Persona"}
                {post.personas?.title && <span className="text-sm text-muted-foreground"> • {post.personas.title}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formattedDate}</span>
                {post.posted_to_linkedin && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-blue-500">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      Posted
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </Button>
        </div>

        {/* Topic & Image Preset Badge */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-block rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {post.topic}
          </div>
          {post.image_preset && (
            <div className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {post.image_preset.charAt(0).toUpperCase() + post.image_preset.slice(1)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mb-4 whitespace-pre-wrap text-sm leading-relaxed break-words">{displayContent}</div>

        {shouldTruncate && (
          <Button variant="link" size="sm" onClick={() => setExpanded(!expanded)} className="mb-2 h-auto p-0 text-xs">
            {expanded ? "Show less" : "Show more"}
          </Button>
        )}

        {/* Image Display */}
        {post.image_url && (
          <div className="my-4 overflow-hidden rounded-lg border">
            <img
              src={post.image_url || "/placeholder.svg"}
              alt="Post visual"
              className="h-auto w-full max-h-96 object-contain bg-muted"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 border-t pt-4">
          <Button onClick={handleCopy} size="sm" variant="outline" className="bg-transparent">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
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
