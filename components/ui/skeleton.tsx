import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-blue-100/50 dark:bg-blue-900/20 animate-pulse rounded-md', className)}
      {...props}
    />
  )
}

export { Skeleton }
