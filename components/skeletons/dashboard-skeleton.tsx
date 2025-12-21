import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="mb-8">
                <Skeleton className="h-9 w-48 mb-2" />
                <Skeleton className="h-5 w-96" />
            </div>

            {/* Stats Grid Skeleton */}
            <div className="mb-8 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border bg-card p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                            <Skeleton className="h-12 w-12 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions Skeleton */}
            <div className="rounded-lg border bg-card p-6">
                <Skeleton className="h-6 w-32 mb-1" />
                <Skeleton className="h-4 w-64 mb-6" />

                <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-lg" />
                    ))}
                </div>
            </div>
        </div>
    )
}
