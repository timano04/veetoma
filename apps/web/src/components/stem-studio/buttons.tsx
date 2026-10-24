"use client"

import { motion, type HTMLMotionProps } from "motion/react"
import { cn } from "@/lib/utils"

export function PrimaryButton({ className, children, ...props }: HTMLMotionProps<"button">) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className={cn(
        "glow-gold relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1f3a27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export function GhostButton({ className, children, ...props }: HTMLMotionProps<"button">) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium ring-1 ring-white/25 transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export function StepHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#ffe29a]">{eyebrow}</p>
      <h3 className="mt-1 text-xl font-semibold tracking-tight text-balance">{title}</h3>
      <p className="mt-1 max-w-xl text-sm text-pretty text-white/75">{description}</p>
    </div>
  )
}
