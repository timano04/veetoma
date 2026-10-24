"use client"

import { ArrowLeft } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Artwork } from "@/components/artwork"
import { GlassCard } from "@/components/glass"
import { PROFILES, type ProfileId, type Space, type StepNumber } from "@/lib/stems"
import { ImportStep } from "./import-step"
import { MixerStep } from "./mixer-step"
import { ProcessingStep } from "./processing-step"
import { ProfileStep } from "./profile-step"
import { SpaceStatusBadge } from "./space-status"
import { Stepper } from "./stepper"

type SpaceViewProps = {
  space: Space
  step?: StepNumber
  onBack: () => void
  onSelectStep: (step: StepNumber) => void
  onContinue: () => void
  onProfile: (profile: ProfileId) => void
  onStart: () => void
  onCancel: () => void
  onOpenMixer: () => void
}

export function SpaceView({
  space,
  step,
  onBack,
  onSelectStep,
  onContinue,
  onProfile,
  onStart,
  onCancel,
  onOpenMixer,
}: SpaceViewProps) {
  const currentStep = step || space.step || 1

  return (
    <GlassCard
      className="w-full will-change-transform"
      contentClassName="p-5 md:p-7"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <motion.button
          type="button"
          onClick={onBack}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm ring-1 ring-white/25 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-4" />
          All spaces
        </motion.button>
        <Artwork
          seed={space.id + space.name}
          src={space.cover}
          className="size-11 shrink-0 rounded-xl ring-1 ring-white/30"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight">{space.name}</h2>
          <p className="truncate text-xs text-white/70">
            {space.artist} &middot; {PROFILES[space.profile].name}
          </p>
        </div>
        <SpaceStatusBadge space={space} />
      </div>

      <div className="my-6">
        <Stepper
          current={currentStep}
          reached={Math.max(space.reached, currentStep) as StepNumber}
          processing={space.status === "processing"}
          onSelect={onSelectStep}
        />
      </div>

      <div className="h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />

      <div className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="will-change-transform"
          >
            {currentStep === 1 && <ImportStep space={space} onNext={onContinue} />}
            {currentStep === 2 && (
              <ProfileStep space={space} onChange={onProfile} onBack={() => onSelectStep(1)} onStart={onStart} />
            )}
            {currentStep === 3 && (
              <ProcessingStep space={space} onCancel={onCancel} onOpenMixer={onOpenMixer} onRetry={onStart} />
            )}
            {currentStep === 4 && <MixerStep space={space} onRerun={() => onSelectStep(2)} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </GlassCard>
  )
}
