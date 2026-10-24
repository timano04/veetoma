import type { WaveStyle } from "@/lib/seed"

import type { AudioJob } from "@/types/job"

export type StemId = "vocals" | "instrumental" | "drums" | "bass" | "guitar" | "piano" | "other"
export type ProfileId = "2" | "4" | "6"
export type SpaceStatus = "draft" | "processing" | "ready" | "failed"
export type StepNumber = 1 | 2 | 3 | 4

export const STEMS: Record<StemId, { label: string; color: string; frequency: number; style: WaveStyle }> = {
  vocals: { label: "Vocals", color: "#ffd479", frequency: 440, style: "phrases" },
  instrumental: { label: "Instrumental", color: "#8fd3ff", frequency: 330, style: "sustained" },
  drums: { label: "Drums", color: "#ff8f7a", frequency: 110, style: "spiky" },
  bass: { label: "Bass", color: "#c4a6ff", frequency: 65, style: "smooth" },
  guitar: { label: "Guitar", color: "#8ff0b4", frequency: 392, style: "sustained" },
  piano: { label: "Piano", color: "#ff9fd0", frequency: 523, style: "phrases" },
  other: { label: "Other", color: "#d4dbe0", frequency: 262, style: "sustained" },
}

export type Profile = {
  id: ProfileId
  count: number
  name: string
  tag: string
  description: string
  stems: StemId[]
  eta: string
}

export const PROFILES: Record<ProfileId, Profile> = {
  "2": {
    id: "2",
    count: 2,
    name: "2 Stems",
    tag: "Vocal / Instrumental",
    description: "A fast split for karaoke, acapellas and backing tracks.",
    stems: ["vocals", "instrumental"],
    eta: "~30 sec",
  },
  "4": {
    id: "4",
    count: 4,
    name: "4 Stems",
    tag: "Standard",
    description: "The classic breakdown for remixing, practice and sampling.",
    stems: ["vocals", "drums", "bass", "other"],
    eta: "~45 sec",
  },
  "6": {
    id: "6",
    count: 6,
    name: "6 Stems",
    tag: "Pro Studio",
    description: "Maximum detail with dedicated guitar and piano channels.",
    stems: ["vocals", "drums", "bass", "guitar", "piano", "other"],
    eta: "~70 sec",
  },
}

export const PROFILE_LIST = Object.values(PROFILES)

export const STEPS: { number: StepNumber; label: string; short: string }[] = [
  { number: 1, label: "Import & Preview", short: "Import" },
  { number: 2, label: "Profile Selection", short: "Profile" },
  { number: 3, label: "AI Processing", short: "Process" },
  { number: 4, label: "Studio Mixer", short: "Mixer" },
]

export type Space = {
  id: string
  name: string
  artist: string
  ext: string
  size: number
  sizeEstimated: boolean
  duration: number
  src?: string
  ownsSrc: boolean
  cover?: string
  profile: ProfileId
  status: SpaceStatus
  progress: number
  step: StepNumber
  reached: StepNumber
  createdLabel: string
  file?: File | null
  jobId?: string | null
  job?: AudioJob | null
  stemUrls?: Partial<Record<StemId, string>>
  errorMessage?: string | null
}

export function resolveAudioUrl(url: string | undefined | null): string {
  if (!url) return ""
  const clean = url.trim()
  // Route backend stems through same-origin endpoint to prevent browser CORS / private network issues
  const stemsMatch = clean.match(/\/api\/files\/stems\/([a-f0-9-]+)\/([a-zA-Z0-9_.-]+)/i)
  if (stemsMatch) {
    return `/api/stems/${stemsMatch[1]}/${stemsMatch[2]}`
  }
  return clean
}

export function extractStemUrls(job: AudioJob): Partial<Record<StemId, string>> {
  const result: Partial<Record<StemId, string>> = {}
  if (job.vocalsUrl) result.vocals = resolveAudioUrl(job.vocalsUrl)
  if (job.drumsUrl) result.drums = resolveAudioUrl(job.drumsUrl)
  if (job.bassUrl) result.bass = resolveAudioUrl(job.bassUrl)
  if (job.otherUrl) result.other = resolveAudioUrl(job.otherUrl)
  if (job.guitarUrl) result.guitar = resolveAudioUrl(job.guitarUrl)
  if (job.pianoUrl) result.piano = resolveAudioUrl(job.pianoUrl)
  if (job.instrumentalUrl) result.instrumental = resolveAudioUrl(job.instrumentalUrl)
  return result
}

const LANE_START = 20
const LANE_SPAN = 40

export function stemProgress(index: number, count: number, progress: number) {
  const start = LANE_START + (count > 1 ? (index * LANE_SPAN) / (count - 1) : 0)
  return Math.max(0, Math.min(100, ((progress - start) / LANE_SPAN) * 100))
}

export function phaseLabel(profile: Profile, progress: number) {
  if (progress >= 100) return "Separation complete"
  if (progress < 10) return "Analyzing the master waveform"
  if (progress < LANE_START) return "Mapping the frequency spectrum"
  if (progress >= LANE_START + LANE_SPAN + 20) return "Rendering studio-grade WAV stems"
  const active = profile.stems.findIndex((_, i) => {
    const p = stemProgress(i, profile.count, progress)
    return p > 0 && p < 100
  })
  const stem = profile.stems[active === -1 ? profile.count - 1 : active]
  return `Isolating ${STEMS[stem].label.toLowerCase()}`
}
