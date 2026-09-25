'use client'

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Anchor, Copy, IdCard, Lightbulb, Loader2, MessageSquareText, PenSquare, UserPlus, UserRound, Zap } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"
import { useCoins } from "@/hooks/use-coins"
import { usePersonas } from "@/hooks/use-personas"
import { useProfile } from "@/hooks/use-profile"
import { CREDIT_COSTS } from "@/lib/pricing"

const TOOLS = [
  {
    id: "headline",
    label: "Headline",
    icon: IdCard,
    title: "Headline optimizer",
    description: "The line under your name decides whether people click. Get 5 sharper versions.",
    inputLabel: "Your current headline + who you help + one proof point",
    placeholder: "Current: Software Engineer at Acme\nI help fintech teams ship faster. Led a migration that cut deploy time 70%.",
    limit: 220,
    toStudio: false,
  },
  {
    id: "about",
    label: "About",
    icon: UserRound,
    title: "About section rewrite",
    description: "Two About drafts with a hook in the first two lines, proof, and a call to action.",
    inputLabel: "Your background, wins, what you want people to contact you for",
    placeholder: "8 years in B2B SaaS marketing. Grew Acme's pipeline 3x. Now consulting on demand gen for Series A startups...",
    limit: 2600,
    toStudio: false,
  },
  {
    id: "ideas",
    label: "Post ideas",
    icon: Lightbulb,
    title: "Post idea generator",
    description: "Ten specific ideas for your niche. Send any of them straight to the Studio.",
    inputLabel: "Your niche, audience, and what you want to be known for",
    placeholder: "Product manager in healthtech, audience is other PMs and founders, want to be known for shipping in regulated industries.",
    limit: null,
    toStudio: true,
  },
  {
    id: "hooks",
    label: "Hooks",
    icon: Anchor,
    title: "Hook rewriter",
    description: "Only the first two lines show before 'see more'. Get 6 openings with different angles.",
    inputLabel: "Paste your draft post",
    placeholder: "Paste the full draft here...",
    limit: 200,
    toStudio: true,
  },
  {
    id: "comment",
    label: "Comments",
    icon: MessageSquareText,
    title: "Comment assistant",
    description: "Thoughtful comments on other people's posts are the fastest way to get seen. Paste a post, pick a reply.",
    inputLabel: "Paste the post you want to comment on",
    placeholder: "Paste someone's LinkedIn post here...",
    limit: 1250,
    toStudio: false,
  },
  {
    id: "connect",
    label: "Connection notes",
    icon: UserPlus,
    title: "Connection request notes",
    description: "Short, specific notes that get accepted. No pitch.",
    inputLabel: "Who is this person and why do you want to connect?",
    placeholder: "Jane Doe, VP Eng at Stripe. Spoke at KubeCon about platform teams. I'm building an internal dev platform.",
    limit: 300,
    toStudio: false,
  },
] as const

type ToolId = (typeof TOOLS)[number]["id"]

function ToolkitContent() {
  const searchParams = useSearchParams()
  const requested = searchParams.get("tool")
  const { user } = useAuth()
  const { profile } = useProfile()
  const { personas } = usePersonas()
  const { mutateCoins } = useCoins()

  const [toolId, setToolId] = useState<ToolId>(TOOLS.find((t) => t.id === requested)?.id ?? "headline")
  const [inputs, setInputs] = useState<Partial<Record<ToolId, string>>>({})
  const [results, setResults] = useState<Partial<Record<ToolId, string[]>>>({})
  const [personaId, setPersonaId] = useState("none")
  const [loading, setLoading] = useState(false)

  const tool = TOOLS.find((t) => t.id === toolId)!
  const input = inputs[toolId] ?? ""
  const options = results[toolId] ?? []
  const ownPersonas = personas.filter((p) => p.user_id === user?.id)
  const free = Boolean(profile?.ai_engine_free)

  const run = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: toolId, input, personaId: personaId === "none" ? undefined : personaId }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Generation failed")
      setResults((prev) => ({ ...prev, [toolId]: data.options }))
      if (typeof data.remainingCoins === "number") await mutateCoins(data.remainingCoins)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed")
    } finally {
      setLoading(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied")
    } catch {
      toast.error("Copy failed")
    }
  }

  return (
    <div className="space-y-3 p-1 sm:p-2 md:p-3">
      <PageHeader
        title="Growth Toolkit"
        description="Fix your profile, find ideas, and engage with your network, all in your voice."
        rightSlot={<Badge variant="secondary">{free ? "Free on your subscription" : `${CREDIT_COSTS.tool} coin per run`}</Badge>}
      />

      <Tabs value={toolId} onValueChange={(v) => setToolId(v as ToolId)}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="h-auto">
            {TOOLS.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="gap-1.5 px-3 py-1.5">
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="flex items-center gap-2">
              <tool.icon className="h-5 w-5 text-primary" />
              {tool.title}
            </CardTitle>
            <CardDescription>{tool.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2 sm:p-6 sm:pt-2">
            <div className="space-y-2">
              <Label htmlFor="toolkit-input">{tool.inputLabel}</Label>
              <Textarea
                id="toolkit-input"
                rows={7}
                value={input}
                onChange={(e) => setInputs((prev) => ({ ...prev, [toolId]: e.target.value }))}
                placeholder={tool.placeholder}
              />
            </div>
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select value={personaId} onValueChange={setPersonaId}>
                <SelectTrigger className="w-full">
                  {/* Explicit label: Radix leaves the trigger blank until the menu has been opened once. */}
                  <SelectValue>{ownPersonas.find((p) => p.id === personaId)?.name ?? "Neutral professional"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Neutral professional</SelectItem>
                  {ownPersonas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}{p.title ? ` - ${p.title}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full sm:w-auto" onClick={run} disabled={loading || input.trim().length < 5 || (!free && (profile?.coins ?? 0) < CREDIT_COSTS.tool)}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              {options.length ? "Generate again" : "Generate"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle>Options</CardTitle>
            <CardDescription>Copy what you like, or edit before you use it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-2 sm:p-6 sm:pt-2" aria-live="polite">
            {loading ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Writing options...
              </div>
            ) : options.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Results show up here.</div>
            ) : (
              options.map((option, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{option}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {tool.limit ? (
                      <span className={`metric-mono text-xs ${option.length > tool.limit ? "text-destructive" : "text-muted-foreground"}`}>
                        {option.length}/{tool.limit}
                      </span>
                    ) : null}
                    <div className="ml-auto flex gap-1.5">
                      {tool.toStudio ? (
                        <Button asChild size="sm" variant="outline" className="h-7 bg-transparent text-xs">
                          <Link href={`/dashboard/generate?topic=${encodeURIComponent(option.slice(0, 480))}`}>
                            <PenSquare className="mr-1 h-3.5 w-3.5" /> Write post
                          </Link>
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" className="h-7 bg-transparent text-xs" onClick={() => copy(option)}>
                        <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ToolkitPage() {
  return (
    <Suspense>
      <ToolkitContent />
    </Suspense>
  )
}
