import { AlertTriangle, CheckCircle2, CircleDashed, Loader2 } from "lucide-react"
import { PROFILES, STEPS, type Space } from "@/lib/stems"
import { cn } from "@/lib/utils"

export function SpaceStatusBadge({ space, className }: { space: Space; className?: string }) {
  const base = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ring-1"

  if (space.status === "processing") {
    return (
      <span className={cn(base, "bg-[#ffe29a]/25 text-[#fff1c4] ring-[#ffe29a]/50", className)}>
        <Loader2 className="size-3.5 animate-spin" />
        Processing {Math.floor(space.progress)}%
      </span>
    )
  }
  if (space.status === "ready") {
    return (
      <span className={cn(base, "bg-emerald-300/20 text-emerald-100 ring-emerald-200/40", className)}>
        <CheckCircle2 className="size-3.5" />
        {PROFILES[space.profile].count} stems ready
      </span>
    )
  }
  if (space.status === "failed") {
    return (
      <span className={cn(base, "bg-rose-500/20 text-rose-200 ring-rose-400/40", className)}>
        <AlertTriangle className="size-3.5" />
        Separation Failed
      </span>
    )
  }
  return (
    <span className={cn(base, "bg-white/10 text-white/80 ring-white/25", className)}>
      <CircleDashed className="size-3.5" />
      Draft &middot; {STEPS[space.step - 1].short}
    </span>
  )
}
