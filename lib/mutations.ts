'use client'

import { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { CACHE_KEYS } from '@/lib/cache-keys'

export interface Persona {
    id: string
    user_id: string
    name: string
    title: string | null
    personality: string
    writing_style: string
    avatar_url: string | null
    is_suggested: boolean
    is_public?: boolean
    is_app_provided?: boolean
    original_persona_id?: string | null
}

/**
 * Clone a public/app-provided persona to the user's collection
 */
export async function clonePersona(personaId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient()

        // Fetch the original persona
        const { data: originalPersona, error: fetchError } = await supabase
            .from('personas')
            .select('*')
            .eq('id', personaId)
            .single()

        if (fetchError || !originalPersona) {
            return { success: false, error: 'Persona not found' }
        }

        // Create a new persona with the same data but user's user_id
        const { error: insertError } = await supabase
            .from('personas')
            .insert({
                user_id: userId,
                name: originalPersona.name,
                title: originalPersona.title,
                personality: originalPersona.personality,
                writing_style: originalPersona.writing_style,
                avatar_url: originalPersona.avatar_url,
                is_public: false, // User's copy is private by default
                is_app_provided: false, // User's copy is not app-provided
                original_persona_id: personaId, // Track the source
            })

        if (insertError) {
            return { success: false, error: insertError.message }
        }

        // Invalidate personas cache to refresh the list
        await mutate(CACHE_KEYS.personas)

        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Publish a persona (make it public)
 */
export async function publishPersona(personaId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient()

        // First check if this is an app-provided persona (can't be published/unpublished by users)
        const { data: persona } = await supabase
            .from('personas')
            .select('is_app_provided, original_persona_id')
            .eq('id', personaId)
            .single()

        if (persona?.is_app_provided) {
            return { success: false, error: 'Cannot modify app-provided personas' }
        }

        // Prevent publishing of cloned personas (to avoid endless loops of copies)
        if (persona?.original_persona_id) {
            return { success: false, error: 'Cannot publish cloned personas. Please create a unique persona to publish.' }
        }

        const { error } = await supabase
            .from('personas')
            .update({ is_public: true })
            .eq('id', personaId)

        if (error) {
            return { success: false, error: error.message }
        }

        // Invalidate both caches
        await mutate(CACHE_KEYS.personas)
        await mutate(CACHE_KEYS.explorePersonas)

        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Unpublish a persona (make it private)
 */
export async function unpublishPersona(personaId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient()

        // First check if this is an app-provided persona (can't be published/unpublished by users)
        const { data: persona } = await supabase
            .from('personas')
            .select('is_app_provided')
            .eq('id', personaId)
            .single()

        if (persona?.is_app_provided) {
            return { success: false, error: 'Cannot modify app-provided personas' }
        }

        const { error } = await supabase
            .from('personas')
            .update({ is_public: false })
            .eq('id', personaId)

        if (error) {
            return { success: false, error: error.message }
        }

        // Invalidate both caches
        await mutate(CACHE_KEYS.personas)
        await mutate(CACHE_KEYS.explorePersonas)

        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Delete a persona
 */
export async function deletePersona(personaId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient()

        // First check if this is an app-provided persona (can't be deleted by users)
        const { data: persona } = await supabase
            .from('personas')
            .select('is_app_provided')
            .eq('id', personaId)
            .single()

        if (persona?.is_app_provided) {
            return { success: false, error: 'Cannot delete app-provided personas' }
        }

        const { error } = await supabase
            .from('personas')
            .delete()
            .eq('id', personaId)

        if (error) {
            return { success: false, error: error.message }
        }

        // Invalidate both caches
        await mutate(CACHE_KEYS.personas)
        await mutate(CACHE_KEYS.explorePersonas)

        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Optimistically deduct coins and update the backend
 */
export async function deductCoinsWithUpdate(amount: number, currentCoins: number): Promise<{ newBalance: number; error?: string }> {
    try {
        const response = await fetch('/api/deduct-coins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount }),
        })

        if (!response.ok) {
            throw new Error('Failed to deduct coins')
        }

        const { newBalance } = await response.json()

        // Update the cache with the real balance
        await mutate(CACHE_KEYS.coins, newBalance, false)

        return { newBalance }
    } catch (error) {
        // Revert optimistic update
        await mutate(CACHE_KEYS.coins, currentCoins, false)
        return { newBalance: currentCoins, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}


/**
 * Update user profile (e.g. name)
 */
export async function updateProfile(userId: string, updates: { full_name?: string }): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient()

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)

        if (error) {
            return { success: false, error: error.message }
        }

        // Invalidate user cache
        await mutate(CACHE_KEYS.user)

        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Delete user account
 * Note: This usually requires a server-side admin delete or a specific RPC function if RLS prevents self-deletion from auth.users.
 * For now, we'll try standard Supabase auth delete if allowed, or just data cleanup and sign out.
 * Actually, Supabase client cannot delete the auth user directly usually. 
 * We might need an API route for this if we want to delete from auth.users.
 * Let's implement an API route call for safety and correctness.
 */
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch('/api/auth/delete-account', {
            method: 'DELETE',
        })

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to delete account')
        }

        // Clear cache and storage
        if (typeof window !== 'undefined') {
            localStorage.clear()
            sessionStorage.clear()
        }

        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// Legacy exports for backwards compatibility
export { clonePersona as cloneAvatar }
export { publishPersona as publishAvatar }
export { unpublishPersona as unpublishAvatar }

