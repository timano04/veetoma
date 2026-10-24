import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

type RangeProps = {
  value: number
  onChange: (value: number) => void
  label: string
  min?: number
  max?: number
  step?: number
  color?: string
  className?: string
}

export function Range({ value, onChange, label, min = 0, max = 100, step = 1, color, className }: RangeProps) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100
  const style = { "--pct": `${pct}%`, ...(color ? { "--fill": color } : {}) } as CSSProperties

  return (
    <input
      type="range"
      aria-label={label}
      className={cn("range", className)}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={style}
    />
  )
}
