"use client"

import { useEffect, useRef } from "react"
import { Check, SlidersHorizontal, X, AlertTriangle, RefreshCw, Cpu } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { PROFILES, STEMS, phaseLabel, stemProgress, type Space } from "@/lib/stems"
import { cn } from "@/lib/utils"
import { GhostButton, PrimaryButton, StepHeading } from "./buttons"

const RADIUS = 88
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function Orb({ space }: { space: Space }) {
  const profile = PROFILES[space.profile]
  const done = space.status === "ready"
  const failed = space.status === "failed"

  return (
    <div className="relative mx-auto size-[220px] shrink-0">
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="absolute inset-4 rounded-full border border-[#ffe29a]/60"
          animate={done || failed ? { opacity: 0 } : { scale: [1, 1.45], opacity: [0.5, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 1.3, ease: "easeOut" }}
        />
      ))}

      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="orb-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={failed ? "#f87171" : "#ffd479"} />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke="url(#orb-gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - (failed ? 100 : space.progress) / 100)}
          className="transition-[stroke-dashoffset] duration-300 ease-linear"
          style={{ filter: failed ? "drop-shadow(0 0 6px rgba(248,113,113,0.8))" : "drop-shadow(0 0 6px rgba(255,214,130,0.8))" }}
        />
      </svg>

      {profile.stems.map((stem, i) => (
        <motion.span
          key={stem}
          aria-hidden="true"
          className="absolute"
          style={{ inset: i % 2 === 0 ? -6 : 6, rotate: (360 / profile.count) * i }}
          animate={done || failed ? undefined : { rotate: (360 / profile.count) * i + (i % 2 === 0 ? 360 : -360) }}
          transition={{ duration: 7 + i * 1.2, repeat: Infinity, ease: "linear" }}
        >
          <span
            className="absolute left-1/2 top-0 size-3 -translate-x-1/2 rounded-full"
            style={{ backgroundColor: STEMS[stem].color, boxShadow: `0 0 12px 3px ${STEMS[stem].color}` }}
          />
        </motion.span>
      ))}

      <div className="absolute inset-9 flex flex-col items-center justify-center rounded-full bg-black/25 ring-1 ring-white/25 backdrop-blur-md">
        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.span
              key="done"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
              className="flex size-16 items-center justify-center rounded-full bg-white text-[#1f3a27] glow-gold"
            >
              <Check className="size-8" strokeWidth={3} />
            </motion.span>
          ) : failed ? (
            <motion.span
              key="failed"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex size-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/50"
            >
              <AlertTriangle className="size-8" />
            </motion.span>
          ) : (
            <motion.span key="progress" exit={{ opacity: 0 }} className="flex flex-col items-center">
              <span className="font-mono text-4xl font-semibold tabular-nums">{Math.floor(space.progress)}</span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-white/70">percent</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Lane({ index, space }: { index: number; space: Space }) {
  const profile = PROFILES[space.profile]
  const stem = profile.stems[index]
  const info = STEMS[stem]
  const p = stemProgress(index, profile.count, space.progress)
  const active = p > 0 && p < 100 && space.status === "processing"
  const done = p >= 100 || space.status === "ready"
  const state = done ? "Done" : active ? `Separating ${Math.floor(p)}%` : space.status === "failed" ? "Interrupted" : "Queued"

  return (
    <motion.li
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 200, damping: 20 }}
      className="glass-panel-soft rounded-2xl px-3.5 py-3"
      style={active ? { boxShadow: `0 0 22px ${info.color}40, inset 1px 1px 0 rgba(255,255,255,0.2)` } : undefined}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex h-5 items-end gap-0.5 ${active ? "eq-playing" : ""}`}
          style={{ opacity: p === 0 ? 0.35 : 1 }}
        >
          {[0, 160, 320, 80].map((delay) => (
            <span
              key={delay}
              className="eq-bar h-full w-[3px] rounded-full"
              style={{ backgroundColor: info.color, animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        <span className="flex-1 text-sm font-medium">{info.label}</span>
        <span className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-white/75">
          {done && <Check className="size-3.5 text-success" strokeWidth={3} />}
          {state}
        </span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-linear"
          style={{ width: `${done ? 100 : p}%`, backgroundColor: info.color }}
        />
      </div>
    </motion.li>
  )
}

type ProcessingStepProps = {
  space: Space
  onCancel: () => void
  onOpenMixer: () => void
  onRetry?: () => void
}

export function ProcessingStep({ space, onCancel, onOpenMixer, onRetry }: ProcessingStepProps) {
  const profile = PROFILES[space.profile]
  const done = space.status === "ready"
  const failed = space.status === "failed"
  const wasProcessing = useRef(space.status === "processing")

  useEffect(() => {
    if (!wasProcessing.current || space.status !== "ready") return
    wasProcessing.current = false
    const id = setTimeout(onOpenMixer, 1600)
    return () => clearTimeout(id)
  }, [space.status, onOpenMixer])

  return (
    <div>
      <StepHeading
        eyebrow="Step 3 of 4"
        title={
          done
            ? "Your stems are ready"
            : failed
            ? "Separation pipeline encountered an issue"
            : "The AI is separating your track"
        }
        description={
          done
            ? "Every channel has been rendered and verified by Core API. Opening the studio mixer in a moment."
            : failed
            ? "An error occurred during Demucs neural inference. You can retry the job or switch models."
            : "PyTorch Demucs worker is isolating individual audio stems. Progress updates every 3 seconds."
        }
      />

      <div className="grid items-center gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
        <Orb space={space} />

        <div className="min-w-0">
          <div className="mb-4 h-7" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={failed ? "failed" : phaseLabel(profile, space.progress)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={cn("text-lg font-medium", failed ? "text-rose-400" : "text-[#ffe29a]")}
              >
                {failed
                  ? space.errorMessage || "Demucs AI Worker execution failed"
                  : phaseLabel(profile, space.progress)}
              </motion.p>
            </AnimatePresence>
          </div>

          <ul className="space-y-2.5">
            {profile.stems.map((stem, i) => (
              <Lane key={stem} index={i} space={space} />
            ))}
          </ul>

          <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
            <Cpu className="size-3.5 text-cyan-400" />
            <span>
              {space.jobId
                ? `Job ID: ${space.jobId.slice(0, 8)}... • Spring Boot Core API + Demucs v4`
                : "Demucs v4 Neural Engine • High fidelity stem separation"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        {done ? (
          <PrimaryButton onClick={onOpenMixer}>
            <SlidersHorizontal className="size-4" />
            Open studio mixer
          </PrimaryButton>
        ) : failed ? (
          <>
            <GhostButton onClick={onCancel}>
              <X className="size-4" />
              Choose profile
            </GhostButton>
            {onRetry && (
              <PrimaryButton onClick={onRetry}>
                <RefreshCw className="size-4" />
                Retry separation
              </PrimaryButton>
            )}
          </>
        ) : (
          <GhostButton onClick={onCancel}>
            <X className="size-4" />
            Cancel
          </GhostButton>
        )}
      </div>
    </div>
  )
}
