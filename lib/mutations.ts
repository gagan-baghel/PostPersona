'use client'

import { mutate } from 'swr'
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

export async function clonePersona(personaId: string, _userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`/api/personas/${personaId}/clone`, {
            method: 'POST',
        })

        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            return { success: false, error: data.error || 'Failed to clone persona' }
        }

        await mutate(CACHE_KEYS.personas)
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function publishPersona(personaId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`/api/personas/${personaId}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPublic: true }),
        })

        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            return { success: false, error: data.error || 'Failed to publish persona' }
        }

        await mutate(CACHE_KEYS.personas)
        await mutate(CACHE_KEYS.explorePersonas)
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function unpublishPersona(personaId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`/api/personas/${personaId}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPublic: false }),
        })

        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            return { success: false, error: data.error || 'Failed to unpublish persona' }
        }

        await mutate(CACHE_KEYS.personas)
        await mutate(CACHE_KEYS.explorePersonas)
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function deletePersona(personaId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`/api/personas/${personaId}`, {
            method: 'DELETE',
        })

        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            return { success: false, error: data.error || 'Failed to delete persona' }
        }

        await mutate(CACHE_KEYS.personas)
        await mutate(CACHE_KEYS.explorePersonas)
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function deductCoinsWithUpdate(amount: number, currentCoins: number): Promise<{ newBalance: number; error?: string }> {
    try {
        const response = await fetch('/api/deduct-coins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, transaction_type: 'deduction' }),
        })

        if (!response.ok) {
            throw new Error('Failed to deduct coins')
        }

        const { newBalance } = await response.json()
        await mutate(CACHE_KEYS.coins, newBalance, false)

        return { newBalance }
    } catch (error) {
        await mutate(CACHE_KEYS.coins, currentCoins, false)
        return { newBalance: currentCoins, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function updateProfile(
    _userId: string,
    updates: {
        full_name?: string
        default_persona_public?: boolean
        allow_profile_in_explore?: boolean
        posting_schedule?: Record<string, string>
        auto_post_enabled?: boolean
        timezone?: string
    },
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch('/api/user', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        })

        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            return { success: false, error: data.error || 'Failed to update profile' }
        }

        await mutate(CACHE_KEYS.user)
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch('/api/auth/delete-account', {
            method: 'DELETE',
        })

        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            throw new Error(data.error || 'Failed to delete account')
        }

        if (typeof window !== 'undefined') {
            localStorage.clear()
            sessionStorage.clear()
        }

        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function connectLinkedIn(nextPath?: string): Promise<{ success: boolean; error?: string; authUrl?: string }> {
    try {
        const response = await fetch('/api/linkedin/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nextPath }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
            return { success: false, error: data.error || 'Failed to connect LinkedIn' }
        }
        return { success: true, authUrl: data.authUrl }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function disconnectLinkedIn(): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch('/api/linkedin/disconnect', { method: 'POST' })
        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            return { success: false, error: data.error || 'Failed to disconnect LinkedIn' }
        }
        await mutate(CACHE_KEYS.user)
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function connectX(nextPath?: string): Promise<{ success: boolean; error?: string; authUrl?: string }> {
    try {
        const response = await fetch('/api/x/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nextPath }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
            return { success: false, error: data.error || 'Failed to connect X' }
        }
        return { success: true, authUrl: data.authUrl }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function disconnectX(): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch('/api/x/disconnect', { method: 'POST' })
        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            return { success: false, error: data.error || 'Failed to disconnect X' }
        }
        await mutate(CACHE_KEYS.user)
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
