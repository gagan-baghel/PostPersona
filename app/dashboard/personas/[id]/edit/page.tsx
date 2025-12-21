'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { PersonaForm } from "@/components/persona-form"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"

interface Persona {
    id: string
    name: string
    title: string | null
    personality: string
    writing_style: string
    avatar_url: string | null
    is_app_provided?: boolean
}

export default function EditPersonaPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { user } = useAuth()
    const [persona, setPersona] = useState<Persona | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadPersona() {
            const { id } = await params
            const supabase = createClient()

            const { data: personaData, error: fetchError } = await supabase
                .from("personas")
                .select("*")
                .eq("id", id)
                .single()

            if (fetchError || !personaData) {
                setError("Persona not found")
                setIsLoading(false)
                return
            }

            // Check if user owns this persona
            if (personaData.user_id !== user?.id) {
                setError("You don't have permission to edit this persona")
                setIsLoading(false)
                return
            }

            // Check if it's an app-provided persona
            if (personaData.is_app_provided) {
                setError("App-provided personas cannot be edited")
                setIsLoading(false)
                return
            }

            setPersona(personaData)
            setIsLoading(false)
        }

        if (user) {
            loadPersona()
        }
    }, [params, user])

    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 md:p-8">
                <div className="mx-auto max-w-2xl">
                    <div className="mb-8">
                        <Skeleton className="h-9 w-48 mb-2" />
                        <Skeleton className="h-5 w-72" />
                    </div>
                    <div className="rounded-lg border bg-card p-6 space-y-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 sm:p-6 md:p-8">
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-lg border bg-destructive/10 p-6 text-center">
                        <h2 className="text-lg font-semibold text-destructive">{error}</h2>
                        <button
                            onClick={() => router.push("/dashboard/personas")}
                            className="mt-4 text-sm text-muted-foreground hover:underline"
                        >
                            ← Back to Personas
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!persona) {
        return null
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="mx-auto max-w-2xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Edit Persona</h1>
                    <p className="mt-2 text-muted-foreground">Update your AI persona's personality and writing style</p>
                </div>

                <PersonaForm persona={persona} />
            </div>
        </div>
    )
}
