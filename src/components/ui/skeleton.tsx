import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-ink/10 animate-pulse rounded-[3px]", className)}
      {...props}
    />
  )
}

export { Skeleton }
