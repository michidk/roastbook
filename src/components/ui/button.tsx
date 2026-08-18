import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent font-display text-sm font-bold whitespace-nowrap shadow-none transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/45 active:translate-y-px disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 motion-reduce:transition-none dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'border-primary bg-primary text-primary-foreground shadow-control hover:border-coffee hover:bg-coffee',
        primary:
          'border-primary bg-primary text-primary-foreground shadow-control hover:border-coffee hover:bg-coffee',
        destructive:
          'border-destructive bg-destructive text-white shadow-control hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'border-border bg-card/90 text-foreground shadow-control hover:border-input hover:bg-secondary',
        secondary:
          'border-border bg-secondary text-secondary-foreground hover:border-input/70 hover:bg-accent',
        ghost:
          'text-muted-foreground hover:bg-secondary hover:text-foreground dark:hover:bg-secondary/60',
        link: 'rounded-none text-link underline-offset-4 hover:text-foreground hover:underline active:translate-y-0',
      },
      size: {
        default:
          'h-11 px-5 py-2 has-[>svg]:px-4 [@media(hover:hover)_and_(pointer:fine)]:h-10',
        xs: "h-11 gap-1 px-2.5 text-xs has-[>svg]:px-2 [@media(hover:hover)_and_(pointer:fine)]:h-6 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-11 gap-1.5 px-3.5 text-[13px] has-[>svg]:px-3 [@media(hover:hover)_and_(pointer:fine)]:h-8',
        lg: 'h-12 px-7 text-base has-[>svg]:px-5',
        icon: 'size-11 [@media(hover:hover)_and_(pointer:fine)]:size-10',
        'icon-xs':
          "size-11 [@media(hover:hover)_and_(pointer:fine)]:size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-11 [@media(hover:hover)_and_(pointer:fine)]:size-8',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
