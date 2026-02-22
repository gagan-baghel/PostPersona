'use client'

import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { useExplorePersonas } from "@/hooks/use-explore-personas"
import { usePersonas } from "@/hooks/use-personas"
import { clonePersona, deletePersona, publishPersona, unpublishPersona } from "@/lib/mutations"
import { PersonaGridSkeleton } from "@/components/skeletons/persona-grid-skeleton"
import { toast } from "sonner"
import { Crown, Edit, Globe, Loader2, Lock, MoreHorizontal, Plus, Search, Sparkles, Trash2, Users } from "lucide-react"

interface Persona {
  id: string
  user_id: string
  name: string
  title: string | null
  personality: string
  writing_style: string
  avatar_url: string | null
  is_public?: boolean
  is_app_provided?: boolean
  original_persona_id?: string | null
  created_at: string
}

export default function PersonasPage() {
  const { user } = useAuth()
  const { personas, isLoading: loadingMine, refetch: refetchMine } = usePersonas()
  const { explorePersonas, isLoading: loadingExplore, refetch: refetchExplore } = useExplorePersonas()

  const [activeTab, setActiveTab] = useState("my")
  const [query, setQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState<"all" | "app" | "community">("all")
  const [sortBy, setSortBy] = useState<"newest" | "name">("newest")

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [personaToDelete, setPersonaToDelete] = useState<Persona | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const clonedOriginalIds = useMemo(
    () => new Set(personas.filter((p) => p.original_persona_id).map((p) => p.original_persona_id as string)),
    [personas],
  )

  const filteredMine = useMemo(() => {
    const lower = query.toLowerCase().trim()
    let list = personas.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.title?.toLowerCase().includes(lower) ||
        p.personality.toLowerCase().includes(lower),
    )
    if (sortBy === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    } else {
      list = [...list].sort((a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at)))
    }
    return list
  }, [personas, query, sortBy])

  const filteredExplore = useMemo(() => {
    const lower = query.toLowerCase().trim()
    let list = explorePersonas.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.title?.toLowerCase().includes(lower) ||
        p.personality.toLowerCase().includes(lower),
    )

    if (sourceFilter === "app") list = list.filter((p) => p.is_app_provided)
    if (sourceFilter === "community") list = list.filter((p) => !p.is_app_provided)

    if (sortBy === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    } else {
      list = [...list].sort((a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at)))
    }

    return list
  }, [explorePersonas, query, sourceFilter, sortBy])

  const handleClone = async (personaId: string, name: string) => {
    if (!user) return
    setProcessingId(personaId)
    const result = await clonePersona(personaId, user.id)
    if (result.success) {
      toast.success(`${name} added to your personas`)
      await refetchMine()
    } else {
      toast.error(result.error || "Failed to clone persona")
    }
    setProcessingId(null)
  }

  const handlePublishToggle = async (persona: Persona) => {
    setProcessingId(persona.id)
    const result = persona.is_public ? await unpublishPersona(persona.id) : await publishPersona(persona.id)
    if (result.success) {
      toast.success(persona.is_public ? "Persona is now private" : "Persona is now public")
      await Promise.all([refetchMine(), refetchExplore()])
    } else {
      toast.error(result.error || "Failed to update visibility")
    }
    setProcessingId(null)
  }

  const confirmDelete = (persona: Persona) => {
    setPersonaToDelete(persona)
    setDeleteDialogOpen(true)
  }

  const handleDeletePersona = async () => {
    if (!personaToDelete) return
    setIsDeleting(true)
    const result = await deletePersona(personaToDelete.id)
    if (result.success) {
      toast.success(`${personaToDelete.name} deleted`)
      await Promise.all([refetchMine(), refetchExplore()])
    } else {
      toast.error(result.error || "Failed to delete persona")
    }
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setPersonaToDelete(null)
  }

  return (
    <div className="space-y-4 p-2 sm:p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Personas</h1>
        <Button asChild>
          <Link href="/dashboard/personas/new"><Plus className="mr-2 h-4 w-4" />Create Persona</Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search persona name, role, personality" className="pl-9" />
        </div>
        <Select value={sortBy} onValueChange={(v: "newest" | "name") => setSortBy(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Sort: Newest</SelectItem>
            <SelectItem value="name">Sort: Name</SelectItem>
          </SelectContent>
        </Select>
        {activeTab === "explore" ? (
          <Select value={sourceFilter} onValueChange={(v: "all" | "app" | "community") => setSourceFilter(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="app">PersonaPost only</SelectItem>
              <SelectItem value="community">Community only</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div />
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my">My Personas ({personas.length})</TabsTrigger>
          <TabsTrigger value="explore">Explore ({explorePersonas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-6">
          {loadingMine ? (
            <PersonaGridSkeleton />
          ) : filteredMine.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">No personas found</h3>
              <p className="mt-2 text-sm text-muted-foreground">Create one from scratch or clone from Explore.</p>
              <Button asChild className="mt-5"><Link href="/dashboard/personas/new">Create Persona</Link></Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredMine.map((persona) => (
                <article key={persona.id} className="rounded-xl border bg-card p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{persona.name}</h3>
                      {persona.title && <p className="truncate text-xs text-muted-foreground">{persona.title}</p>}
                    </div>
                    <Badge variant={persona.is_public ? "default" : "secondary"}>
                      {persona.is_public ? <Globe className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />}
                      {persona.is_public ? "Public" : "Private"}
                    </Badge>
                  </div>

                  <p className="mb-1 text-xs font-medium text-muted-foreground">Personality</p>
                  <p className="line-clamp-2 text-sm">{persona.personality}</p>
                  <p className="mb-1 mt-3 text-xs font-medium text-muted-foreground">Writing Style</p>
                  <p className="line-clamp-2 text-sm">{persona.writing_style}</p>

                  <div className="mt-4 flex gap-2">
                    <Button asChild variant="outline" className="flex-1 bg-transparent" size="sm">
                      <Link href={`/dashboard/personas/${persona.id}/edit`}><Edit className="mr-1.5 h-3.5 w-3.5" />Edit</Link>
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      variant={persona.is_public ? "secondary" : "default"}
                      disabled={processingId === persona.id || (!!persona.original_persona_id && !persona.is_public)}
                      onClick={() => handlePublishToggle(persona)}
                    >
                      {processingId === persona.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      {persona.is_public ? "Unpublish" : persona.original_persona_id ? "Cloned" : "Publish"}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/personas/${persona.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => confirmDelete(persona)}>
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="explore" className="mt-6">
          {loadingExplore ? (
            <PersonaGridSkeleton />
          ) : filteredExplore.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No explore personas found</h3>
              <p className="mt-2 text-sm text-muted-foreground">Try changing filters or publish your own persona.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredExplore.map((persona) => {
                const isOwner = user?.id === persona.user_id
                const alreadyCloned = clonedOriginalIds.has(persona.id)

                return (
                  <article key={persona.id} className="rounded-xl border bg-card p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{persona.name}</h3>
                        {persona.title && <p className="truncate text-xs text-muted-foreground">{persona.title}</p>}
                      </div>
                      <Badge variant={persona.is_app_provided ? "default" : "outline"}>
                        {persona.is_app_provided ? <Crown className="mr-1 h-3 w-3" /> : <Users className="mr-1 h-3 w-3" />}
                        {persona.is_app_provided ? "PersonaPost" : "Community"}
                      </Badge>
                    </div>

                    <p className="mb-1 text-xs font-medium text-muted-foreground">Personality</p>
                    <p className="line-clamp-2 text-sm">{persona.personality}</p>
                    <p className="mb-1 mt-3 text-xs font-medium text-muted-foreground">Writing Style</p>
                    <p className="line-clamp-2 text-sm">{persona.writing_style}</p>

                    <div className="mt-4">
                      {isOwner ? (
                        <Button asChild className="w-full" variant="outline">
                          <Link href={`/dashboard/personas/${persona.id}/edit`}><Edit className="mr-2 h-4 w-4" />Manage</Link>
                        </Button>
                      ) : alreadyCloned ? (
                        <Button disabled className="w-full" variant="secondary">Already in your library</Button>
                      ) : (
                        <Button className="w-full" onClick={() => handleClone(persona.id, persona.name)} disabled={processingId === persona.id}>
                          {processingId === persona.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                          Add to My Personas
                        </Button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete persona?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{personaToDelete?.name}" and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePersona} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
