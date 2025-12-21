'use client'

import { CoinPurchaseClient } from "@/components/coin-purchase-client"
import { useCoins } from "@/hooks/use-coins"
import { Skeleton } from "@/components/ui/skeleton"

export default function CoinsPage() {
  const { coins, isLoading } = useCoins()

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>

          {/* Skeleton for coin balance */}
          <div className="mb-12 rounded-lg border bg-card p-8 text-center">
            <Skeleton className="h-6 w-32 mx-auto mb-2" />
            <Skeleton className="h-12 w-24 mx-auto" />
          </div>

          {/* Skeleton for pricing cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border bg-card p-6">
                <Skeleton className="h-6 w-20 mb-4" />
                <Skeleton className="h-10 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-6" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Buy Coins</h1>
          <p className="mt-2 text-muted-foreground">Purchase coins to generate posts and images</p>
        </div>

        {/* Current Balance */}
        <div className="mb-12 rounded-lg border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
          <p className="mt-2 text-5xl font-bold">{coins}</p>
          <p className="mt-1 text-xs text-muted-foreground">coins</p>
        </div>

        <CoinPurchaseClient />
      </div>
    </div>
  )
}
