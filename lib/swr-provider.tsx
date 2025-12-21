'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { SWRConfig } from 'swr'

const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.')
        throw error
    }
    return res.json()
}

export function SWRProvider({ children }: { children: ReactNode }) {
    return (
        <SWRConfig
            value={{
                fetcher,
                revalidateOnFocus: false,
                revalidateOnReconnect: true,
                dedupingInterval: 2000,
                errorRetryCount: 3,
            }}
        >
            {children}
        </SWRConfig>
    )
}
