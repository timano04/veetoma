"use client"

import { ArrowLeft, Check, Clock, Sparkles } from "lucide-react"
import { motion } from "motion/react"
import { PROFILE_LIST, STEMS, type ProfileId, type Space } from "@/lib/stems"
import { cn } from "@/lib/utils"
import { GhostButton, PrimaryButton, StepHeading } from "./buttons"

type ProfileStepProps = {
  space: Space
  onChange: (profile: ProfileId) => void
  onBack: () => void
  onStart: () => void
}

export function ProfileStep({ space, onChange, onBack, onStart }: ProfileStepProps) {
  return (
    <div>
      <StepHeading
        eyebrow="Step 2 of 4"
        title="Choose a separation profile"
        description="More stems means finer control, and a little more processing time. You can always run it again."
      />

      <div role="radiogroup" aria-label="Separation profile" className="grid gap-4 md:grid-cols-3">
        {PROFILE_LIST.map((profile, i) => {
          const selected = space.profile === profile.id
          return (
            <motion.button
              key={profile.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(profile.id)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 18, delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative flex flex-col rounded-3xl p-5 text-left ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                selected ? "glow-gold bg-white/25 ring-white/70" : "glass-panel-soft ring-white/15 hover:bg-white/15",
              )}
            >
              {profile.id === "6" && (
                <span className="absolute right-4 top-4 rounded-full bg-[#ffe29a] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2d3a1f]">
                  Pro
                </span>
              )}
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border transition-colors",
                  selected ? "border-white bg-white text-[#1f3a27]" : "border-white/40",
                )}
              >
                {selected && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}>
                    <Check className="size-3.5" strokeWidth={3} />
                  </motion.span>
                )}
              </span>

              <span className="mt-4 flex items-baseline gap-2">
                <span className="font-mono text-5xl font-semibold tabular-nums leading-none">{profile.count}</span>
                <span className="text-sm text-white/70">stems</span>
              </span>
              <span className="mt-2 text-sm font-semibold">{profile.tag}</span>
              <span className="mt-1 text-sm text-pretty text-white/70">{profile.description}</span>

              <span className="mt-4 flex flex-wrap gap-1.5">
                {profile.stems.map((stem) => (
                  <span
                    key={stem}
                    className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1 text-xs"
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: STEMS[stem].color }} />
                    {STEMS[stem].label}
                  </span>
                ))}
              </span>

              <span className="mt-4 flex items-center gap-1.5 text-xs text-white/70">
                <Clock className="size-3.5" />
                Estimated {profile.eta}
              </span>
            </motion.button>
          )
        })}
      </div>

      {space.status === "ready" && (
        <p className="mt-4 text-xs text-white/70">This space already has stems. Starting again will replace them.</p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <GhostButton onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </GhostButton>
        <PrimaryButton onClick={onStart} className="shimmer">
          <Sparkles className="size-4" />
          Start AI separation
        </PrimaryButton>
      </div>
    </div>
  )
}
