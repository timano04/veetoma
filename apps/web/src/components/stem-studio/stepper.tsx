"use client"

import { Check, FileAudio, Layers, SlidersHorizontal, Sparkles, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import { STEPS, type StepNumber } from "@/lib/stems"
import { cn } from "@/lib/utils"

const ICONS: Record<StepNumber, LucideIcon> = {
  1: FileAudio,
  2: Layers,
  3: Sparkles,
  4: SlidersHorizontal,
}

type StepperProps = {
  current: StepNumber
  reached: StepNumber
  processing: boolean
  onSelect: (step: StepNumber) => void
}

export function Stepper({ current, reached, processing, onSelect }: StepperProps) {
  return (
    <ol className="flex items-center" aria-label="Workflow steps">
      {STEPS.map((step, i) => {
        const Icon = ICONS[step.number]
        const isCurrent = step.number === current
        const isDone = step.number < reached && !(step.number === 3 && processing)
        const locked = step.number > reached
        const isLast = i === STEPS.length - 1

        return (
          <li key={step.number} className={cn("flex items-center", !isLast && "flex-1")}>
            <button
              type="button"
              disabled={locked}
              onClick={() => onSelect(step.number)}
              aria-current={isCurrent ? "step" : undefined}
              className="group flex items-center gap-2.5 rounded-full py-1 pr-1 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed sm:pr-3"
            >
              <span className="relative flex size-10 shrink-0 items-center justify-center">
                {isCurrent && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-[#ffe29a]/60"
                    animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <motion.span
                  layout
                  animate={{ scale: isCurrent ? 1.08 : 1 }}
                  className={cn(
                    "relative flex size-10 items-center justify-center rounded-full ring-1 transition-colors",
                    isCurrent && "glow-gold bg-white text-[#1f3a27] ring-white",
                    isDone && !isCurrent && "bg-white/25 text-white ring-white/40 group-hover:bg-white/35",
                    !isCurrent && !isDone && !locked && "bg-white/15 text-white ring-white/30",
                    locked && "bg-white/5 text-white/40 ring-white/15",
                  )}
                >
                  {isDone && !isCurrent ? (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                      <Check className="size-5" />
                    </motion.span>
                  ) : (
                    <Icon className={cn("size-5", step.number === 3 && processing && "animate-pulse")} />
                  )}
                </motion.span>
              </span>
              <span className={cn("hidden text-left leading-tight md:block", locked && "opacity-50")}>
                <span className="block text-[11px] uppercase tracking-wider text-white/60">Step {step.number}</span>
                <span className={cn("block text-sm font-medium", isCurrent && "text-white")}>{step.label}</span>
              </span>
            </button>

            {!isLast && (
              <span aria-hidden="true" className="relative mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-white/20">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-white to-[#ffe29a]"
                  initial={false}
                  animate={{ width: reached > step.number ? "100%" : "0%" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
