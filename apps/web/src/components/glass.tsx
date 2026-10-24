"use client"

import { useRef } from "react"
import { motion, type HTMLMotionProps } from "motion/react"
import { cn } from "@/lib/utils"

const DEFAULT_SCALE = "77"

export function GlassFilterDefs() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="pointer-events-none absolute">
      <filter id="glass-distortion">
        <feTurbulence type="turbulence" baseFrequency="0.008" numOctaves="2" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale={DEFAULT_SCALE} />
      </filter>
    </svg>
  )
}

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode
  contentClassName?: string
  initial?: any
  animate?: any
  exit?: any
  transition?: any
  whileHover?: any
  whileTap?: any
}

export function GlassCard({
  children,
  className,
  contentClassName,
  initial,
  animate,
  exit,
  transition,
  whileHover,
  whileTap,
  ...rest
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    el.style.setProperty("--mx", `${x}px`)
    el.style.setProperty("--my", `${y}px`)
  }

  const handleLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty("--mx", "50%")
    el.style.setProperty("--my", "0%")
  }

  return (
    <div
      ref={ref}
      className={cn("glass-card transition-opacity duration-150", className)}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      {...rest}
    >
      <div className="glass-filter" />
      <div className="glass-distortion-overlay" />
      <div className="glass-overlay" />
      <div className="glass-specular" />
      <div className={cn("glass-content", contentClassName)}>{children}</div>
    </div>
  )
}
