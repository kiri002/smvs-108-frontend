import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        destructive: "border-transparent bg-destructive text-white",
        warning: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
        success: "border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

/** A status pill coloured by the configured colour (status colours are configuration). */
function ColorBadge({ color, className, children, ...props }: React.ComponentProps<"span"> & { color?: string | null }) {
  const c = color ?? "#64748b"
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap", className)}
      style={{ borderColor: `${c}55`, backgroundColor: `${c}1a`, color: c }}
      {...props}
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: c }} />
      {children}
    </span>
  )
}

export { Badge, badgeVariants, ColorBadge }
