"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react"
import { SpaceView } from "@/components/stem-studio/space-view"
import { useStudio } from "@/context/studio-context"
import { GlassCard } from "@/components/glass"
import type { Space, StepNumber } from "@/lib/stems"

const STEP_MAP: Record<string, StepNumber> = {
  step1: 1,
  step2: 2,
  step3: 3,
  step4: 4,
}

export default function StemStudioSpaceStepPage() {
  const router = useRouter()
  const params = useParams<{ id: string; step: string }>()
  const id = (params?.id as string) || ""
  const step = (params?.step as string) || ""
  const stepKey = step?.toLowerCase()
  const currentStep: StepNumber = STEP_MAP[stepKey] || 4

  const {
    spaces,
    patchSpace,
    startSeparationForActive,
    cancelSeparationForActive,
    ensureSpaceLoaded,
  } = useStudio()

  const [loading, setLoading] = useState(true)
  const [space, setSpace] = useState<Space | undefined>(() => spaces.find((s) => s.id === id))

  // State Hydration from URL ID:
  // 1. Checks memory cache
  // 2. If missing (e.g. direct shared URL or refresh), fetches from Spring Boot backend automatically
  useEffect(() => {
    let isMounted = true

    const cached = spaces.find((s) => s.id === id)
    if (cached) {
      setSpace(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    ensureSpaceLoaded(id)
      .then((loaded) => {
        if (!isMounted) return
        if (loaded) {
          setSpace(loaded)
        }
        setLoading(false)
      })
      .catch(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id, spaces, ensureSpaceLoaded])

  // Redirect invalid step names to canonical step4 or step1
  useEffect(() => {
    if (step && !STEP_MAP[stepKey]) {
      router.replace(`/stem/${id}/step4`)
    }
  }, [id, step, stepKey, router])

  if (loading) {
    return (
      <GlassCard className="w-full p-12 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#ffe29a]" />
          <p className="text-sm font-medium text-white/90">Hydrating audio workspace...</p>
          <p className="text-xs text-white/60">Fetching stem separation metadata from Core API</p>
        </div>
      </GlassCard>
    )
  }

  if (!space) {
    return (
      <GlassCard className="w-full p-8 md:p-12 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4">
          <div className="glow-gold flex size-14 items-center justify-center rounded-full bg-white text-[#1f3a27]">
            <Sparkles className="size-7" />
          </div>
          <h2 className="text-xl font-semibold">Space Not Found</h2>
          <p className="text-sm text-white/70">
            Could not find an audio workspace matching ID: <span className="font-mono text-xs text-[#ffe29a]">{id}</span>.
          </p>
          <Link
            href="/stem"
            className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 text-sm font-medium ring-1 ring-white/30 transition-all hover:bg-white/30"
          >
            <ArrowLeft className="size-4" />
            Back to Space Gallery
          </Link>
        </div>
      </GlassCard>
    )
  }

  const handleSelectStep = (targetStep: StepNumber) => {
    patchSpace(space.id, { step: targetStep })
    router.push(`/stem/${space.id}/step${targetStep}`)
  }

  const handleContinue = () => {
    patchSpace(space.id, { step: 2, reached: Math.max(space.reached, 2) as StepNumber })
    router.push(`/stem/${space.id}/step2`)
  }

  const handleStart = async () => {
    router.push(`/stem/${space.id}/step3`)
    await startSeparationForActive()
  }

  const handleCancel = () => {
    cancelSeparationForActive()
    router.push(`/stem/${space.id}/step2`)
  }

  const handleOpenMixer = () => {
    patchSpace(space.id, { step: 4, reached: 4 })
    router.push(`/stem/${space.id}/step4`)
  }

  return (
    <SpaceView
      space={space}
      step={currentStep}
      onBack={() => router.push("/stem")}
      onSelectStep={handleSelectStep}
      onContinue={handleContinue}
      onProfile={(profile) => patchSpace(space.id, { profile })}
      onStart={handleStart}
      onCancel={handleCancel}
      onOpenMixer={handleOpenMixer}
    />
  )
}
