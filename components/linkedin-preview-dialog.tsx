"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface LinkedInPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  avatar: {
    name: string
    title: string | null
    avatar_url: string | null
  }
  content: string
  imageUrl: string | null
  onPost: () => void
  onSaveForLater: () => void
  isPosting: boolean
}

export function LinkedInPreviewDialog({
  open,
  onOpenChange,
  avatar,
  content,
  imageUrl,
  onPost,
  onSaveForLater,
  isPosting,
}: LinkedInPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Preview Your LinkedIn Post</DialogTitle>
          <DialogDescription>Review how your post will appear on LinkedIn before publishing.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4 pt-4 pb-2">
            {/* LinkedIn-style preview */}
            <div className="rounded-lg border bg-background">
              {/* Post header */}
              <div className="flex items-start gap-3 p-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                  {avatar.avatar_url ? (
                    <img
                      src={avatar.avatar_url || "/placeholder.svg"}
                      alt={avatar.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-primary">{avatar.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{avatar.name}</div>
                  {avatar.title && <div className="text-xs text-muted-foreground">{avatar.title}</div>}
                  <div className="mt-1 text-xs text-muted-foreground">Just now • 🌐</div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </Button>
              </div>

              {/* Post content - with proper text wrapping */}
              <div className="px-4 pb-3">
                <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">{content}</div>
              </div>

              {/* Post image - constrained height */}
              {imageUrl && (
                <div className="border-y">
                  <img
                    src={imageUrl || "/placeholder.svg"}
                    alt="Post visual"
                    className="h-auto w-full max-h-[400px] object-cover"
                  />
                </div>
              )}

              {/* Engagement bar */}
              <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[8px] text-white">
                      👍
                    </div>
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">
                      ❤️
                    </div>
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">
                      💡
                    </div>
                  </div>
                  <span>24</span>
                </div>
                <div className="flex gap-3">
                  <span>5 comments</span>
                  <span>2 reposts</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-4 gap-1 p-2">
                {["Like", "Comment", "Repost", "Send"].map((action) => (
                  <Button key={action} variant="ghost" size="sm" className="h-9 text-xs font-medium">
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-3 flex-shrink-0 pt-4 border-t">
          <Button onClick={onPost} disabled={isPosting} className="flex-1" size="lg">
            {isPosting ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Posting...
              </>
            ) : (
              "Post to LinkedIn"
            )}
          </Button>
          <Button onClick={onSaveForLater} variant="outline" className="flex-1 bg-transparent" size="lg">
            Save for Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
