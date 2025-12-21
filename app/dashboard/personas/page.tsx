'use client'

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
    Globe,
    Lock,
    Plus,
    Edit,
    Sparkles,
    Trash2,
    MoreHorizontal,
    Users,
    Crown,
    Loader2
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { usePersonas } from "@/hooks/use-personas"
import { useExplorePersonas } from "@/hooks/use-explore-personas"
import { useAuth } from "@/hooks/use-auth"
import { PersonaGridSkeleton } from "@/components/skeletons/persona-grid-skeleton"
import { clonePersona, publishPersona, unpublishPersona, deletePersona } from "@/lib/mutations"
import { toast } from "sonner"

interface Persona {
    id: string
    user_id: string
    name: string
    title: string | null
    personality: string
    writing_style: string
    avatar_url: string | null
    is_suggested?: boolean
    is_public?: boolean
    is_app_provided?: boolean
    original_persona_id?: string | null
    created_at: string
}

export default function PersonasPage() {
    const { user } = useAuth()
    const { personas, isLoading, refetch } = usePersonas()
    const { explorePersonas, isLoading: exploreLoading, refetch: refetchExplore } = useExplorePersonas()
    const [activeTab, setActiveTab] = useState("my-personas")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [personaToDelete, setPersonaToDelete] = useState<Persona | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Track loading state for specific personas
    const [processingPersonaId, setProcessingPersonaId] = useState<string | null>(null)

    const handleClonePersona = async (personaId: string, personaName: string) => {
        if (!user) return
        setProcessingPersonaId(personaId)

        const result = await clonePersona(personaId, user.id)
        if (result.success) {
            toast.success(`${personaName} added to your personas`)
            await refetch()
        } else {
            toast.error(result.error || 'Failed to add persona')
        }
        setProcessingPersonaId(null)
    }

    const handlePublishPersona = async (personaId: string, personaName: string) => {
        setProcessingPersonaId(personaId)
        const result = await publishPersona(personaId)
        if (result.success) {
            toast.success(`${personaName} is now public`)
            await Promise.all([refetch(), refetchExplore()])
        } else {
            toast.error(result.error || 'Failed to publish persona')
        }
        setProcessingPersonaId(null)
    }

    const handleUnpublishPersona = async (personaId: string, personaName: string) => {
        setProcessingPersonaId(personaId)
        const result = await unpublishPersona(personaId)
        if (result.success) {
            toast.success(`${personaName} is now private`)
            await Promise.all([refetch(), refetchExplore()])
        } else {
            toast.error(result.error || 'Failed to unpublish persona')
        }
        setProcessingPersonaId(null)
    }

    const handleDeletePersona = async () => {
        if (!personaToDelete) return

        setIsDeleting(true)
        const result = await deletePersona(personaToDelete.id)
        if (result.success) {
            toast.success(`${personaToDelete.name} deleted`)
            await Promise.all([refetch(), refetchExplore()])
        } else {
            toast.error(result.error || 'Failed to delete persona')
        }
        setIsDeleting(false)
        setDeleteDialogOpen(false)
        setPersonaToDelete(null)
    }

    const openDeleteDialog = (persona: Persona) => {
        setPersonaToDelete(persona)
        setDeleteDialogOpen(true)
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Personas</h1>
                <p className="mt-2 text-muted-foreground">Your AI personas for generating content</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex items-center justify-between border-b">
                    <TabsList className="h-12 bg-transparent border-0">
                        <TabsTrigger
                            value="my-personas"
                            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
                        >
                            My Personas
                        </TabsTrigger>
                        <TabsTrigger
                            value="explore"
                            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
                        >
                            Explore Personas
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === "my-personas" && (
                        <Button asChild>
                            <Link href="/dashboard/personas/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Create Persona
                            </Link>
                        </Button>
                    )}
                </div>

                {/* My Personas Tab */}
                <TabsContent value="my-personas" className="mt-6 space-y-6">
                    {isLoading ? (
                        <PersonaGridSkeleton />
                    ) : personas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-12 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                <Sparkles className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="mt-6 text-lg font-semibold">Create your first persona</h3>
                            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                                AI personas help you generate content that matches your unique voice and style
                            </p>
                            <Button asChild className="mt-6">
                                <Link href="/dashboard/personas/new">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Persona
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {personas.map((persona) => (
                                <div
                                    key={persona.id}
                                    className="group rounded-lg border bg-card p-6 transition-all hover:shadow-md"
                                >
                                    <div className="mb-4 flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold truncate">{persona.name}</h3>
                                            {persona.title && (
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">{persona.title}</p>
                                            )}
                                            <Badge
                                                variant={persona.is_public ? "default" : "secondary"}
                                                className="mt-2 text-xs"
                                            >
                                                {persona.is_public ? (
                                                    <>
                                                        <Globe className="mr-1 h-3 w-3" />
                                                        Public
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="mr-1 h-3 w-3" />
                                                        Private
                                                    </>
                                                )}
                                            </Badge>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/personas/${persona.id}/edit`}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        if (persona.original_persona_id && !persona.is_public) {
                                                            e.preventDefault()
                                                            return
                                                        }
                                                        persona.is_public
                                                            ? handleUnpublishPersona(persona.id, persona.name)
                                                            : handlePublishPersona(persona.id, persona.name)
                                                    }}
                                                    disabled={processingPersonaId === persona.id || (!!persona.original_persona_id && !persona.is_public)}
                                                >
                                                    {processingPersonaId === persona.id ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Globe className="mr-2 h-4 w-4" />
                                                    )}
                                                    {persona.is_public
                                                        ? "Make Private"
                                                        : persona.original_persona_id
                                                            ? "Cannot Publish (Cloned)"
                                                            : "Publish"
                                                    }
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => openDeleteDialog(persona)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="mb-4 space-y-3">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Personality</p>
                                            <p className="text-sm line-clamp-2">{persona.personality}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Writing Style</p>
                                            <p className="text-sm line-clamp-2">{persona.writing_style}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            <Link href={`/dashboard/personas/${persona.id}/edit`}>
                                                <Edit className="mr-1.5 h-3.5 w-3.5" />
                                                Edit
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={persona.is_public ? "secondary" : "default"}
                                            onClick={() =>
                                                persona.is_public
                                                    ? handleUnpublishPersona(persona.id, persona.name)
                                                    : handlePublishPersona(persona.id, persona.name)
                                            }
                                            className="flex-1"
                                            disabled={processingPersonaId === persona.id || (!!persona.original_persona_id && !persona.is_public)}
                                            title={persona.original_persona_id ? "Cloned personas cannot be published" : ""}
                                        >
                                            {processingPersonaId === persona.id && (
                                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                            )}
                                            {persona.is_public
                                                ? "Unpublish"
                                                : persona.original_persona_id
                                                    ? "Cloned"
                                                    : "Publish"
                                            }
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Explore Personas Tab */}
                <TabsContent value="explore" className="mt-6 space-y-6">
                    {exploreLoading ? (
                        <PersonaGridSkeleton />
                    ) : explorePersonas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-12 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                                <Globe className="h-8 w-8 text-accent" />
                            </div>
                            <h3 className="mt-6 text-lg font-semibold">No public personas yet</h3>
                            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                                Be the first to publish a persona for the community!
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {explorePersonas.map((persona) => {
                                const isOwner = user?.id === persona.user_id;
                                return (
                                    <div
                                        key={persona.id}
                                        className="group rounded-lg border bg-card p-6 transition-all hover:shadow-md"
                                    >
                                        <div className="mb-4">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-semibold">{persona.name}</h3>
                                                {isOwner && (
                                                    <Badge variant="secondary" className="text-[10px] h-5">You</Badge>
                                                )}
                                            </div>
                                            {persona.title && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{persona.title}</p>
                                            )}
                                            <Badge
                                                variant={persona.is_app_provided ? "default" : "outline"}
                                                className="mt-2 text-xs"
                                            >
                                                {persona.is_app_provided ? (
                                                    <>
                                                        <Crown className="mr-1 h-3 w-3" />
                                                        PersonaPost
                                                    </>
                                                ) : (
                                                    <>
                                                        <Users className="mr-1 h-3 w-3" />
                                                        Community
                                                    </>
                                                )}
                                            </Badge>
                                        </div>

                                        <div className="mb-4 space-y-3">
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Personality</p>
                                                <p className="text-sm line-clamp-2">{persona.personality}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Writing Style</p>
                                                <p className="text-sm line-clamp-2">{persona.writing_style}</p>
                                            </div>
                                        </div>

                                        {isOwner ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full"
                                                asChild
                                            >
                                                <Link href={`/dashboard/personas/${persona.id}/edit`}>
                                                    <Edit className="mr-1.5 h-3.5 w-3.5" />
                                                    Manage Persona
                                                </Link>
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="w-full"
                                                onClick={() => handleClonePersona(persona.id, persona.name)}
                                                disabled={processingPersonaId === persona.id}
                                            >
                                                {processingPersonaId === persona.id ? (
                                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                )}
                                                Add to My Personas
                                            </Button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Persona</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{personaToDelete?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeletePersona}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
