import { hashString } from "@/lib/seed"
import { cn } from "@/lib/utils"

type ArtworkProps = { seed: string; src?: string; alt?: string; className?: string }

export function Artwork({ seed, src, alt = "", className }: ArtworkProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src || "/placeholder.svg"} alt={alt} className={cn("object-cover", className)} />
    )
  }

  const hue = hashString(seed) % 360
  const hue2 = (hue + 55) % 360

  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden", className)}
      style={{
        background: `radial-gradient(circle at 22% 18%, oklch(0.85 0.15 ${hue}) 0%, transparent 55%),
          radial-gradient(circle at 82% 88%, oklch(0.55 0.17 ${hue2}) 0%, transparent 62%),
          oklch(0.3 0.06 ${hue})`,
      }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full opacity-40" fill="none">
        <circle cx="50" cy="50" r="46" stroke="white" strokeOpacity="0.35" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="36" stroke="white" strokeOpacity="0.3" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="26" stroke="white" strokeOpacity="0.25" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="16" stroke="white" strokeOpacity="0.2" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="3" fill="white" fillOpacity="0.5" />
      </svg>
    </div>
  )
}

export function Equalizer({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex h-4 items-end gap-0.5", playing && "eq-playing", className)}>
      {[0, 220, 440].map((delay) => (
        <span key={delay} className="eq-bar h-full w-[3px] rounded-full bg-white" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  )
}
