import { Skeleton } from "@/components/ui/skeleton"

export function PersonaGridSkeleton() {
    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border bg-card p-6">
                    <div className="mb-4 flex items-start justify-between">
                        <div className="flex-1">
                            <Skeleton className="h-5 w-32 mb-2" />
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-5 w-16" />
                        </div>
                    </div>
                    <div className="mb-4 space-y-3">
                        <div>
                            <Skeleton className="h-3 w-20 mb-1" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4 mt-1" />
                        </div>
                        <div>
                            <Skeleton className="h-3 w-24 mb-1" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3 mt-1" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 flex-1" />
                    </div>
                </div>
            ))}
        </div>
    )
}

// Legacy export for backwards compatibility
export { PersonaGridSkeleton as AvatarGridSkeleton }
