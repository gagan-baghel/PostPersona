import { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"

type PageHeaderProps = {
  title: string
  description?: string
  rightSlot?: ReactNode
  badgeText?: string
}

export function PageHeader({ title, description, rightSlot, badgeText }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
          {badgeText ? <Badge variant="secondary">{badgeText}</Badge> : null}
        </div>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {rightSlot ? <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">{rightSlot}</div> : null}
    </div>
  )
}
