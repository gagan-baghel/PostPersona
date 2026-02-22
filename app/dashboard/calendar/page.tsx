'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { DayButton, DayPicker, type DayButtonProps } from "react-day-picker"
import "react-day-picker/style.css"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"

type CalendarPost = {
  id: string
  topic: string
  workflow_status?: string
  target_platform?: string
  scheduled_for?: number | null
  posted_at?: number | string | null
  created_at?: number | string
}

function toTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const num = Number(value)
    if (Number.isFinite(num)) return num
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function getEventTimestamp(post: CalendarPost): number | null {
  return toTimestamp(post.scheduled_for) ?? toTimestamp(post.posted_at) ?? toTimestamp(post.created_at)
}

function toDateKeyLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function statusBadgeVariant(status?: string): "default" | "secondary" | "outline" {
  if (status === "posted") return "default"
  if (status === "scheduled") return "secondary"
  return "outline"
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<CalendarPost[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/posts?page=1&pageSize=250")
        const data = await response.json().catch(() => [])
        if (response.ok && Array.isArray(data)) {
          setPosts(data)
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const postsByDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>()
    for (const post of posts) {
      const ts = getEventTimestamp(post)
      if (!ts) continue
      const key = toDateKeyLocal(new Date(ts))
      const entries = map.get(key) ?? []
      entries.push(post)
      map.set(key, entries)
    }

    for (const [key, entries] of map.entries()) {
      entries.sort((a, b) => (getEventTimestamp(a) ?? 0) - (getEventTimestamp(b) ?? 0))
      map.set(key, entries)
    }

    return map
  }, [posts])

  const daysWithPosts = useMemo(() => {
    return Array.from(postsByDay.keys()).map((key) => new Date(`${key}T12:00:00`))
  }, [postsByDay])

  const selectedKey = toDateKeyLocal(selectedDate)
  const selectedEntries = useMemo(() => postsByDay.get(selectedKey) ?? [], [postsByDay, selectedKey])

  const CalendarDayButton = useCallback((props: DayButtonProps) => {
    const key = toDateKeyLocal(props.day.date)
    const entries = postsByDay.get(key) ?? []

    return (
      <DayButton {...props} className={`${props.className ?? ""} h-full min-h-[112px] w-full items-start justify-start p-2`}>
        <div className="flex w-full flex-col gap-1">
          <div className="text-xs font-semibold">{props.day.date.getDate()}</div>
          {entries.slice(0, 2).map((entry) => (
            <div key={entry.id} className="rounded-sm bg-muted px-1.5 py-0.5 text-left text-[10px] leading-tight">
              <div className="line-clamp-1 font-medium">{entry.topic}</div>
            </div>
          ))}
          {entries.length > 2 ? <div className="text-[10px] text-muted-foreground">+{entries.length - 2} more</div> : null}
        </div>
      </DayButton>
    )
  }, [postsByDay])

  return (
    <div className="space-y-4 p-2 sm:p-4 md:p-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="xl:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xl">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 bg-transparent"
                onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 bg-transparent"
                onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <DayPicker
              mode="single"
              month={month}
              onMonthChange={setMonth}
              hideNavigation
              selected={selectedDate}
              onSelect={(date) => {
                if (date) setSelectedDate(date)
              }}
              showOutsideDays
              fixedWeeks
              modifiers={{ hasPosts: daysWithPosts }}
              modifiersClassNames={{
                hasPosts: "bg-primary/5",
                selected: "ring-2 ring-primary",
              }}
              classNames={{
                months: "w-full",
                month: "w-full",
                month_grid: "w-full border-separate border-spacing-1",
                weekdays: "grid grid-cols-7",
                weekday: "rounded-md bg-muted/60 p-2 text-center text-xs font-medium text-muted-foreground",
                weeks: "mt-1",
                week: "grid grid-cols-7 gap-1",
                day: "h-[108px] border rounded-md align-top",
                day_button: "h-full w-full text-left",
                nav: "hidden",
                month_caption: "hidden",
                caption_label: "hidden",
              }}
              components={{
                DayButton: CalendarDayButton,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selected Day</CardTitle>
            <p className="text-sm text-muted-foreground">{selectedKey}</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : selectedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries.</p>
            ) : (
              <div className="space-y-2">
                {selectedEntries.map((entry) => {
                  const ts = getEventTimestamp(entry)
                  return (
                    <div key={entry.id} className="rounded-lg border p-2.5">
                      <div className="mb-1 flex items-center gap-1.5">
                        <Badge variant={statusBadgeVariant(entry.workflow_status)}>{entry.workflow_status || "draft"}</Badge>
                        <Badge variant="outline">{entry.target_platform || "linkedin"}</Badge>
                      </div>
                      <p className="line-clamp-2 text-sm font-medium">{entry.topic}</p>
                      <p className="text-[11px] text-muted-foreground">{ts ? new Date(ts).toLocaleString() : "No timestamp"}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
