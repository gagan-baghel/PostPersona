"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Sparkles, Target } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PageHeader } from "@/components/dashboard/page-header"

type Campaign = {
  id: string
  name: string
  goal: string
  audience: string
  pillars: string[]
  cadence_per_week: number
  kpi_target?: string | null
  primary_persona_id?: string | null
  status?: string
  stats?: {
    totalPosts: number
    pending: number
    scheduled: number
    posted: number
    deadLetter: number
  }
}

type PersonaOption = { id: string; name: string }

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [personas, setPersonas] = useState<PersonaOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [activeGenerateId, setActiveGenerateId] = useState<string | null>(null)
  const [generationMode, setGenerationMode] = useState<"dedicated" | "random">("dedicated")
  const [isGeneratingRandom, setIsGeneratingRandom] = useState(false)

  const [name, setName] = useState("")
  const [goal, setGoal] = useState("")
  const [audience, setAudience] = useState("")
  const [pillarsInput, setPillarsInput] = useState("")
  const [cadence, setCadence] = useState("5")
  const [kpi, setKpi] = useState("")
  const [personaId, setPersonaId] = useState("")
  const [randomPersonaId, setRandomPersonaId] = useState("")
  const [randomTopic, setRandomTopic] = useState("")

  const load = async () => {
    setIsLoading(true)
    try {
      const [campaignRes, personaRes] = await Promise.all([fetch("/api/campaigns"), fetch("/api/personas")])
      const campaignsJson = await campaignRes.json().catch(() => [])
      const personasJson = await personaRes.json().catch(() => [])

      if (!campaignRes.ok) throw new Error(campaignsJson.error || "Failed to load campaigns")
      if (!personaRes.ok) throw new Error(personasJson.error || "Failed to load personas")

      setCampaigns(Array.isArray(campaignsJson) ? campaignsJson : [])
      const options = Array.isArray(personasJson)
        ? personasJson.map((p: any) => ({ id: String(p.id), name: String(p.name || "Persona") }))
        : []
      setPersonas(options)
      setPersonaId((prev) => prev || options[0]?.id || "")
      setRandomPersonaId((prev) => prev || options[0]?.id || "")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createCampaign = async () => {
    const pillars = pillarsInput
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
    if (!name.trim() || !goal.trim() || !audience.trim() || pillars.length === 0) {
      toast.error("Please fill all required fields")
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          goal: goal.trim(),
          audience: audience.trim(),
          pillars,
          cadencePerWeek: Number(cadence) || 5,
          kpiTarget: kpi.trim() || undefined,
          primaryPersonaId: personaId || undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to create campaign")
      toast.success("Campaign created")
      setName("")
      setGoal("")
      setAudience("")
      setPillarsInput("")
      setKpi("")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create campaign")
    } finally {
      setIsCreating(false)
    }
  }

  const generateWeek = async (campaignId: string) => {
    setActiveGenerateId(campaignId)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/generate-week`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlatform: "linkedin" }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to generate week")
      toast.success(`Generated ${data.created || 7} posts to review queue`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate")
    } finally {
      setActiveGenerateId(null)
    }
  }

  const generateRandomWeek = async () => {
    if (!randomPersonaId) {
      toast.error("Select persona for random week")
      return
    }

    setIsGeneratingRandom(true)
    try {
      const response = await fetch("/api/posts/review/schedule-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: randomPersonaId,
          topic: randomTopic.trim() || undefined,
          targetPlatform: "linkedin",
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to generate random week")
      toast.success(`Generated ${data.created || 7} random posts to review queue`)
      setRandomTopic("")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate random week")
    } finally {
      setIsGeneratingRandom(false)
    }
  }

  const totalCampaignPosts = useMemo(
    () => campaigns.reduce((sum, campaign) => sum + (campaign.stats?.totalPosts || 0), 0),
    [campaigns],
  )

  return (
    <div className="space-y-4 p-1 sm:p-2 md:p-3">
      <PageHeader
        title="Campaigns"
        description="Generate weekly drafts via dedicated campaign strategy or random weekly mode."
        badgeText={`Total campaign posts: ${totalCampaignPosts}`}
        rightSlot={
          <div className="flex items-center rounded-md border border-border p-0.5">
            <Button
              size="sm"
              variant={generationMode === "dedicated" ? "default" : "ghost"}
              onClick={() => setGenerationMode("dedicated")}
              className="h-7 px-2.5 text-xs"
            >
              Dedicated
            </Button>
            <Button
              size="sm"
              variant={generationMode === "random" ? "default" : "ghost"}
              onClick={() => setGenerationMode("random")}
              className="h-7 px-2.5 text-xs"
            >
              Random
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Create Campaign
          </CardTitle>
          <CardDescription>Set goal, audience, pillars, cadence, and persona once. Generate weekly content in one click.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q2 Founder Brand Campaign" />
          </div>
          <div className="space-y-2">
            <Label>Primary Persona</Label>
            <Select value={personaId} onValueChange={setPersonaId}>
              <SelectTrigger><SelectValue placeholder="Select persona" /></SelectTrigger>
              <SelectContent>
                {personas.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>{persona.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Goal</Label>
            <Textarea rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Build authority around AI product strategy." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Audience</Label>
            <Textarea rows={2} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Startup founders and early product leaders." />
          </div>
          <div className="space-y-2">
            <Label>Pillars (comma separated)</Label>
            <Input value={pillarsInput} onChange={(e) => setPillarsInput(e.target.value)} placeholder="AI strategy, founder lessons, execution playbooks" />
          </div>
          <div className="space-y-2">
            <Label>Cadence per week</Label>
            <Input type="number" min={1} max={14} value={cadence} onChange={(e) => setCadence(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>KPI target (optional)</Label>
            <Input value={kpi} onChange={(e) => setKpi(e.target.value)} placeholder="5% engagement rate, 1000 impressions/post" />
          </div>
          <div className="md:col-span-2">
            <Button onClick={createCampaign} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Campaign
            </Button>
          </div>
        </CardContent>
      </Card>

      {generationMode === "random" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Random Week
            </CardTitle>
            <CardDescription>Generate 7 random posts for the week into review queue.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Persona</Label>
              <Select value={randomPersonaId} onValueChange={setRandomPersonaId}>
                <SelectTrigger><SelectValue placeholder="Select persona" /></SelectTrigger>
                <SelectContent>
                  {personas.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>{persona.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Topic hint (optional)</Label>
              <Input value={randomTopic} onChange={(e) => setRandomTopic(e.target.value)} placeholder="Optional seed topic" />
            </div>
            <div className="md:col-span-3">
              <Button onClick={generateRandomWeek} disabled={isGeneratingRandom || !randomPersonaId}>
                {isGeneratingRandom ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Random Week
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {generationMode === "dedicated" ? (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Campaign Units</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : campaigns.length === 0 ? (
          <EmptyState
            title="No Campaigns Yet"
            description="Create one campaign above, then generate your first 7-post weekly batch."
            icon={<Target className="h-5 w-5 text-primary" />}
          />
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">{campaign.goal}</p>
                  </div>
                  <Badge variant="outline">{campaign.status || "active"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Audience: {campaign.audience}</p>
                <div className="flex flex-wrap gap-1">
                  {(campaign.pillars || []).map((pillar) => (
                    <Badge key={`${campaign.id}-${pillar}`} variant="secondary">{pillar}</Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">Posts: {campaign.stats?.totalPosts || 0}</Badge>
                  <Badge variant="outline">Review: {campaign.stats?.pending || 0}</Badge>
                  <Badge variant="outline">Scheduled: {campaign.stats?.scheduled || 0}</Badge>
                  <Badge variant="outline">Posted: {campaign.stats?.posted || 0}</Badge>
                  <Badge variant="outline">Dead Letter: {campaign.stats?.deadLetter || 0}</Badge>
                </div>
                <Button onClick={() => generateWeek(campaign.id)} disabled={activeGenerateId === campaign.id || generationMode !== "dedicated"}>
                  {activeGenerateId === campaign.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Campaign Week
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </section>
      ) : null}
    </div>
  )
}
