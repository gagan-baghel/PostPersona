import Link from "next/link"
import { ReactNode } from "react"

import { Button } from "@/components/ui/button"

type EmptyStateProps = {
  title: string
  description: string
  icon?: ReactNode
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({ title, description, icon, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed bg-card p-5 text-center sm:p-8">
      {icon ? <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">{icon}</div> : null}
      <h3 className="text-base font-semibold sm:text-lg">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionHref ? (
        <Button asChild className="mt-4">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}

