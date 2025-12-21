import { Skeleton } from "@/components/ui/skeleton"

export function PostHistorySkeleton() {
    return (
        <div className="grid gap-6">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-lg border bg-card p-6">
                    <div className="flex items-start gap-3 mb-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1">
                            <Skeleton className="h-5 w-32 mb-1" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-4" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                </div>
            ))}
        </div>
    )
}
