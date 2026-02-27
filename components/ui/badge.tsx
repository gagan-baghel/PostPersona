import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[2px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow,border-color] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-primary/40 bg-primary/18 text-primary [a&]:hover:bg-primary/26',
        secondary:
          'border-border bg-muted text-muted-foreground [a&]:hover:bg-muted/90',
        destructive:
          'border-destructive/40 bg-destructive/16 text-destructive [a&]:hover:bg-destructive/22 focus-visible:ring-destructive/20',
        outline:
          'border-border text-foreground [a&]:hover:bg-accent/70 [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
