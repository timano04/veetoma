"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  Check,
  Clock,
  Crop,
  Disc,
  Download,
  Layers,
  Music,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Scissors,
  Sparkles,
  Trash2,
  Undo2,
  Volume2,
  X,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { Range } from "@/components/range"
import { formatTime } from "@/lib/format"
import { generatePeaks } from "@/lib/seed"
import { PROFILES, STEMS, resolveAudioUrl, type ProfileId, type Space, type StemId } from "@/lib/stems"
import { audioBufferToWav, createToneWav, downloadBlob } from "@/lib/wav"
import { getStemStreamUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import { GhostButton, StepHeading } from "./buttons"
import { Waveform, type CutSegment, type ToolMode, type TrimRange } from "./waveform"

type StemState = { mute: boolean; solo: boolean; volume: number }

export type TrackEditState = {
  trim: TrimRange
  cuts: CutSegment[]
  splits: number[]
  selection: { startRatio: number; endRatio: number } | null
}

type HistorySnapshot = Record<StemId, TrackEditState>

const PEAK_COUNT = 160
const ROW_GRID = "grid grid-cols-[170px_minmax(0,1fr)] gap-2 sm:grid-cols-[260px_minmax(0,1fr)] sm:gap-3"

type MixerStepProps = {
  space: Space
  onRerun: () => void
}

export function MixerStep({ space, onRerun }: MixerStepProps) {
  // Dynamically resolve actual profile so a 4-stem track never attempts to load non-existent guitar/piano tracks
  const effectiveProfileId = useMemo((): ProfileId => {
    if (space.stemUrls) {
      if (space.stemUrls.guitar || space.stemUrls.piano) return "6"
      if (space.stemUrls.drums && !space.stemUrls.guitar) return "4"
      if (space.stemUrls.instrumental && !space.stemUrls.drums) return "2"
    }
    if (space.job?.modelName === "htdemucs_6s" || space.job?.stemCount === 6) return "6"
    if (space.job?.modelName === "htdemucs_2s" || space.job?.stemCount === 2) return "2"
    if (space.job?.modelName === "htdemucs" || space.job?.stemCount === 4) return "4"
    return space.profile || "4"
  }, [space.stemUrls, space.job, space.profile])

  const profile = PROFILES[effectiveProfileId]
  const [duration, setDuration] = useState(space.duration || 180)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [master, setMaster] = useState(90)
  const [downloaded, setDownloaded] = useState<StemId | null>(null)
  const [downloading, setDownloading] = useState<StemId | null>(null)
  const downloadTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})

  // Read-only detected track metadata
  const detectedBpm = useMemo(() => {
    let hash = 0
    const str = `${space.id}-${space.name}`
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
    const bpms = [88, 95, 108, 116, 120, 124, 128, 134, 140, 168]
    return bpms[hash % bpms.length]
  }, [space.id, space.name])

  const detectedKey = useMemo(() => {
    let hash = 0
    const str = `${space.name}-${space.id}`
    for (let i = 0; i < str.length; i++) hash = (hash * 37 + str.charCodeAt(i)) >>> 0
    const roots = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
    const scales = ["Major", "Minor"]
    const root = roots[hash % roots.length]
    const scale = scales[(hash >> 3) % scales.length]
    return `${root} ${scale}`
  }, [space.id, space.name])

  // Track-isolated channel editing state & Persistence
  const STORAGE_KEY = `veetoma_mixer_edits_${space.id}`
  const [activeStemId, setActiveStemId] = useState<StemId>(profile.stems[0])
  const [toolMode, setToolMode] = useState<ToolMode>("pointer")

  const [trackEdits, setTrackEdits] = useState<Record<StemId, TrackEditState>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`veetoma_mixer_edits_${space.id}`)
        if (saved) {
          return JSON.parse(saved)
        }
      } catch {}
    }
    return Object.fromEntries(
      profile.stems.map((stem) => [
        stem,
        {
          trim: { startRatio: 0, endRatio: 1 },
          cuts: [],
          splits: [],
          selection: null,
        },
      ]),
    ) as unknown as Record<StemId, TrackEditState>
  })

  // Command History Stack (Undo / Redo)
  const [historyPast, setHistoryPast] = useState<HistorySnapshot[]>([])
  const [historyFuture, setHistoryFuture] = useState<HistorySnapshot[]>([])

  // Auto-save edits to localStorage for cross-session continuity
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trackEdits))
      } catch {}
    }
  }, [trackEdits, STORAGE_KEY])

  // Channel volume, mute, solo state
  const [stemState, setStemState] = useState<Record<string, StemState>>(() =>
    Object.fromEntries(profile.stems.map((s) => [s, { mute: false, solo: false, volume: 80 }])),
  )

  // Export Modal state
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"wav" | "mp3">("wav")
  const [applyEditsInExport, setApplyEditsInExport] = useState(true)
  const [normalizeExport, setNormalizeExport] = useState(true)
  const [isRenderingMaster, setIsRenderingMaster] = useState(false)
  const [exportProgressText, setExportProgressText] = useState("")

  const peaks = useMemo(
    () =>
      Object.fromEntries(
        profile.stems.map((s) => [s, generatePeaks(`${space.id}-${s}`, PEAK_COUNT, STEMS[s].style)]),
      ) as Record<StemId, number[]>,
    [space.id, profile.stems],
  )

  const anySolo = Object.values(stemState).some((s) => s.solo)
  const progress = duration ? (time / duration) * 100 : 0
  const tickStep = duration > 240 ? 60 : 30
  const ticks = Array.from({ length: Math.floor(duration / tickStep) + 1 }, (_, i) => i * tickStep)

  // Track-isolated audibility calculation: checks mute, solo, isolated trim, and cuts
  const isStemAudibleAtTime = (stem: StemId, curTime: number) => {
    const s = stemState[stem] || { mute: false, solo: false, volume: 80 }
    if (s.mute) return false
    if (anySolo && !s.solo) return false

    const edit = trackEdits[stem]
    if (!edit || !duration) return true

    // Check stem trim boundaries
    const trimStart = edit.trim.startRatio * duration
    const trimEnd = edit.trim.endRatio * duration
    if (curTime < trimStart || curTime > trimEnd) return false

    // Check stem cut intervals (silenced)
    for (const cut of edit.cuts) {
      const cStart = cut.startRatio * duration
      const cEnd = cut.endRatio * duration
      if (curTime >= cStart && curTime < cEnd) return false
    }

    return true
  }

  // Update audio element volumes based on isolated track audibility
  const syncTrackVolumes = (curTime: number) => {
    profile.stems.forEach((stem) => {
      const audioEl = audioRefs.current[stem]
      if (!audioEl) return
      const s = stemState[stem] || { mute: false, solo: false, volume: 80 }
      const audible = isStemAudibleAtTime(stem, curTime)
      const targetVolume = audible ? Math.max(0, Math.min(1, (master / 100) * (s.volume / 100))) : 0
      if (Math.abs(audioEl.volume - targetVolume) > 0.01) {
        audioEl.volume = targetVolume
      }
    })
  }

  useEffect(() => {
    syncTrackVolumes(time)
  }, [stemState, master, anySolo, trackEdits, time])

  // Play / Pause synchronization
  useEffect(() => {
    if (!playing) {
      profile.stems.forEach((stem) => {
        const audioEl = audioRefs.current[stem]
        if (audioEl && !audioEl.paused) {
          audioEl.pause()
        }
      })
    }
  }, [playing, profile.stems])

  // Gentle synchronization check across stem elements
  useEffect(() => {
    if (!playing) return
    const primaryStem = profile.stems[0]
    const interval = setInterval(() => {
      const primaryAudio = audioRefs.current[primaryStem]
      if (primaryAudio && !primaryAudio.paused) {
        const cur = primaryAudio.currentTime
        syncTrackVolumes(cur)

        profile.stems.slice(1).forEach((stem) => {
          const el = audioRefs.current[stem]
          if (el) {
            if (el.paused && playing) {
              el.play().catch(() => {})
            }
            if (Math.abs(el.currentTime - cur) > 1.2) {
              el.currentTime = cur
            }
          }
        })
      }
    }, 800)
    return () => clearInterval(interval)
  }, [playing, profile.stems, trackEdits, stemState, master, anySolo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(downloadTimer.current)
      Object.values(audioRefs.current).forEach((el) => {
        if (el) el.pause()
      })
    }
  }, [])

  const updateStemState = (stem: StemId, patch: Partial<StemState>) => {
    setStemState((prev) => {
      const next = { ...prev, [stem]: { ...prev[stem], ...patch } }
      return next
    })
  }

  const togglePlay = () => {
    const nextPlaying = !playing
    if (!playing && time >= duration) {
      seek(0)
    }
    setPlaying(nextPlaying)

    profile.stems.forEach(async (stem) => {
      const audioEl = audioRefs.current[stem]
      if (!audioEl) return

      const rawUrl = space.stemUrls?.[stem] || (space.jobId ? getStemStreamUrl(space.jobId, stem) : null)
      const expectedUrl = resolveAudioUrl(rawUrl)

      if (nextPlaying) {
        if (expectedUrl && (!audioEl.src || audioEl.src === "" || !audioEl.src.includes(expectedUrl))) {
          audioEl.src = expectedUrl
          audioEl.load()
        }

        const audible = isStemAudibleAtTime(stem, time)
        const s = stemState[stem] || { mute: false, solo: false, volume: 80 }
        audioEl.volume = audible ? (master / 100) * (s.volume / 100) : 0
        audioEl.playbackRate = 1.0

        try {
          await audioEl.play()
        } catch {
          try {
            if (expectedUrl) audioEl.src = expectedUrl
            audioEl.load()
            await audioEl.play()
          } catch (retryErr) {
            console.error(`[StudioMixer] Play error on stem ${stem}:`, retryErr)
          }
        }
      } else {
        audioEl.pause()
      }
    })
  }

  const seek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(duration, newTime))
    setTime(clamped)
    profile.stems.forEach((stem) => {
      const audioEl = audioRefs.current[stem]
      if (audioEl) {
        audioEl.currentTime = clamped
      }
    })
    syncTrackVolumes(clamped)
  }

  // --- Command History (Undo / Redo) Management ---

  const applyTrackEdits = (updater: (prev: Record<StemId, TrackEditState>) => Record<StemId, TrackEditState>) => {
    setTrackEdits((prev) => {
      const next = updater(prev)
      setHistoryPast((past) => [...past.slice(-30), prev])
      setHistoryFuture([])
      return next
    })
  }

  const handleUndo = useCallback(() => {
    setHistoryPast((past) => {
      if (past.length === 0) return past
      const previous = past[past.length - 1]
      const nextPast = past.slice(0, past.length - 1)
      setHistoryFuture((future) => [trackEdits, ...future])
      setTrackEdits(previous)
      return nextPast
    })
  }, [trackEdits])

  const handleRedo = useCallback(() => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future
      const next = future[0]
      const nextFuture = future.slice(1)
      setHistoryPast((past) => [...past.slice(-30), trackEdits])
      setTrackEdits(next)
      return nextFuture
    })
  }, [trackEdits])

  // --- Track-Isolated Editing Actions ---

  const handleTrackSplitAtPlayhead = (targetStem: StemId) => {
    if (!duration) return
    const ratio = Math.max(0, Math.min(1, time / duration))
    applyTrackEdits((prev) => {
      const current = prev[targetStem]
      if (current.splits.some((s) => Math.abs(s - ratio) < 0.01)) return prev
      return {
        ...prev,
        [targetStem]: {
          ...current,
          splits: [...current.splits, ratio].sort((a, b) => a - b),
        },
      }
    })
  }

  const handleTrackSplitClick = (targetStem: StemId, ratio: number) => {
    applyTrackEdits((prev) => {
      const current = prev[targetStem]
      if (current.splits.some((s) => Math.abs(s - ratio) < 0.01)) return prev
      return {
        ...prev,
        [targetStem]: {
          ...current,
          splits: [...current.splits, ratio].sort((a, b) => a - b),
        },
      }
    })
  }

  // Transient selection dragging does not pollute the undo stack
  const handleTrackSelectRange = (targetStem: StemId, startRatio: number, endRatio: number) => {
    setTrackEdits((prev) => ({
      ...prev,
      [targetStem]: {
        ...prev[targetStem],
        selection: { startRatio, endRatio },
      },
    }))
  }

  const handleTrackTrimToSelection = (targetStem: StemId) => {
    const current = trackEdits[targetStem]
    if (!current?.selection) return
    const start = Math.min(current.selection.startRatio, current.selection.endRatio)
    const end = Math.max(current.selection.startRatio, current.selection.endRatio)
    if (end - start > 0.01) {
      applyTrackEdits((prev) => ({
        ...prev,
        [targetStem]: {
          ...prev[targetStem],
          trim: { startRatio: start, endRatio: end },
          selection: null,
        },
      }))
      syncTrackVolumes(time)
    }
  }

  const handleTrackDeleteSelection = (targetStem: StemId) => {
    const current = trackEdits[targetStem]
    if (!current?.selection) return
    const start = Math.min(current.selection.startRatio, current.selection.endRatio)
    const end = Math.max(current.selection.startRatio, current.selection.endRatio)
    if (end - start > 0.01) {
      const newCut: CutSegment = {
        id: `cut-${targetStem}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        startRatio: start,
        endRatio: end,
      }
      applyTrackEdits((prev) => ({
        ...prev,
        [targetStem]: {
          ...prev[targetStem],
          cuts: [...prev[targetStem].cuts, newCut],
          selection: null,
        },
      }))
      syncTrackVolumes(time)
    }
  }

  const handleTrackDeleteCut = (targetStem: StemId, cutId: string) => {
    applyTrackEdits((prev) => ({
      ...prev,
      [targetStem]: {
        ...prev[targetStem],
        cuts: prev[targetStem].cuts.filter((c) => c.id !== cutId),
      },
    }))
    syncTrackVolumes(time)
  }

  const handleTrackReset = (targetStem: StemId) => {
    applyTrackEdits((prev) => ({
      ...prev,
      [targetStem]: {
        trim: { startRatio: 0, endRatio: 1 },
        cuts: [],
        splits: [],
        selection: null,
      },
    }))
    syncTrackVolumes(time)
  }

  // --- Keyboard Shortcuts System ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey

      // Undo: Ctrl+Z (without shift)
      if (isCtrlOrCmd && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        (isCtrlOrCmd && e.key.toLowerCase() === "y") ||
        (isCtrlOrCmd && e.key.toLowerCase() === "z" && e.shiftKey)
      ) {
        e.preventDefault()
        handleRedo()
        return
      }

      // Delete / Backspace: Remove selected audio range on targeted track
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeEdit = trackEdits[activeStemId]
        if (activeEdit?.selection) {
          e.preventDefault()
          handleTrackDeleteSelection(activeStemId)
        }
        return
      }

      // Spacebar: Play/Pause toggle
      if (e.code === "Space") {
        e.preventDefault()
        togglePlay()
        return
      }

      // Single-key DAW tool shortcuts
      if (!isCtrlOrCmd && !e.altKey) {
        if (e.key.toLowerCase() === "p") setToolMode("pointer")
        if (e.key.toLowerCase() === "r") setToolMode("range")
        if (e.key.toLowerCase() === "s") setToolMode("split")
        if (e.key.toLowerCase() === "d" || e.key.toLowerCase() === "e") setToolMode("delete")
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [trackEdits, activeStemId, handleUndo, handleRedo, playing])

  // --- Isolated Stem Rendering & Download ---

  const handleDownloadTrack = async (stem: StemId) => {
    setDownloading(stem)
    try {
      const rawUrl = space.stemUrls?.[stem] || (space.jobId ? getStemStreamUrl(space.jobId, stem) : null)
      const stemUrl = resolveAudioUrl(rawUrl)
      const edit = trackEdits[stem]

      // If edits exist (trim or cuts), render edited audio buffer through OfflineAudioContext
      const hasEdits = edit && (edit.trim.startRatio > 0 || edit.trim.endRatio < 1 || edit.cuts.length > 0)

      if (stemUrl && hasEdits) {
        const resp = await fetch(stemUrl)
        const arrayBuffer = await resp.arrayBuffer()
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const decoded = await audioCtx.decodeAudioData(arrayBuffer)

        const sampleRate = decoded.sampleRate
        const totalSec = decoded.duration
        const renderFrames = decoded.length
        const offlineCtx = new OfflineAudioContext(decoded.numberOfChannels, renderFrames, sampleRate)

        const source = offlineCtx.createBufferSource()
        source.buffer = decoded
        const gainNode = offlineCtx.createGain()
        gainNode.gain.setValueAtTime(1.0, 0)

        // Apply isolated trim
        const trimStart = edit.trim.startRatio * totalSec
        const trimEnd = edit.trim.endRatio * totalSec
        if (trimStart > 0) {
          gainNode.gain.setValueAtTime(0, 0)
          gainNode.gain.setValueAtTime(1.0, trimStart)
        }
        if (trimEnd < totalSec) {
          gainNode.gain.setValueAtTime(0, trimEnd)
        }

        // Apply isolated cuts
        edit.cuts.forEach((cut) => {
          const cStart = cut.startRatio * totalSec
          const cEnd = cut.endRatio * totalSec
          gainNode.gain.setValueAtTime(0, cStart)
          gainNode.gain.setValueAtTime(1.0, cEnd)
        })

        source.connect(gainNode)
        gainNode.connect(offlineCtx.destination)
        source.start(0)

        const rendered = await offlineCtx.startRendering()
        const wavBlob = audioBufferToWav(rendered)
        downloadBlob(wavBlob, `${space.name}_${STEMS[stem].label}_Edited.wav`)
      } else if (stemUrl) {
        // Direct download unedited stem
        const resp = await fetch(stemUrl)
        const blob = await resp.blob()
        downloadBlob(blob, `${space.name}_${STEMS[stem].label}.wav`)
      } else {
        // Fallback tone WAV
        downloadBlob(createToneWav(STEMS[stem].frequency), `${space.name}_${STEMS[stem].label}.wav`)
      }

      setDownloaded(stem)
      clearTimeout(downloadTimer.current)
      downloadTimer.current = setTimeout(() => setDownloaded(null), 2500)
    } catch (err) {
      console.error("Track download error:", err)
      alert("Failed to download stem file.")
    } finally {
      setDownloading(null)
    }
  }

  // --- Master Multi-Stem Mixdown Render ---

  const handleExportMaster = async () => {
    try {
      setIsRenderingMaster(true)
      setExportProgressText("Loading audio buffers for audible stems...")

      const sampleRate = 44100
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const fetchedBuffers: Array<{ stem: StemId; buffer: AudioBuffer }> = []

      for (let i = 0; i < profile.stems.length; i++) {
        const stem = profile.stems[i]
        const s = stemState[stem] || { mute: false, solo: false, volume: 80 }
        const audible = !s.mute && (!anySolo || s.solo)
        if (!audible) continue

        setExportProgressText(`Decoding ${STEMS[stem].label} channel (${i + 1}/${profile.stems.length})...`)
        const rawUrl = space.stemUrls?.[stem] || (space.jobId ? getStemStreamUrl(space.jobId, stem) : null)
        const stemUrl = resolveAudioUrl(rawUrl)

        if (stemUrl) {
          try {
            const resp = await fetch(stemUrl)
            const arrayBuffer = await resp.arrayBuffer()
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
            fetchedBuffers.push({ stem, buffer: audioBuffer })
          } catch (e) {
            console.warn(`Failed to decode stem ${stem}:`, e)
          }
        }
      }

      if (fetchedBuffers.length === 0) {
        throw new Error("No stem audio buffers were available to render the master mixdown.")
      }

      setExportProgressText("Configuring multi-track master mixdown...")
      const totalRawDuration = Math.max(...fetchedBuffers.map((b) => b.buffer.duration), duration || 60)
      const renderFrames = Math.floor(totalRawDuration * sampleRate)
      const offlineCtx = new OfflineAudioContext(2, renderFrames, sampleRate)

      fetchedBuffers.forEach(({ stem, buffer }) => {
        const s = stemState[stem] || { mute: false, solo: false, volume: 80 }
        const edit = trackEdits[stem]
        const baseVolume = (master / 100) * (s.volume / 100)

        const source = offlineCtx.createBufferSource()
        source.buffer = buffer

        const gainNode = offlineCtx.createGain()
        gainNode.gain.setValueAtTime(baseVolume, 0)

        if (applyEditsInExport && edit) {
          // Isolated Trim
          const trimStart = edit.trim.startRatio * totalRawDuration
          const trimEnd = edit.trim.endRatio * totalRawDuration
          if (trimStart > 0) {
            gainNode.gain.setValueAtTime(0, 0)
            gainNode.gain.setValueAtTime(baseVolume, trimStart)
          }
          if (trimEnd < totalRawDuration) {
            gainNode.gain.setValueAtTime(0, trimEnd)
          }

          // Isolated Cuts
          edit.cuts.forEach((cut) => {
            const cStart = cut.startRatio * totalRawDuration
            const cEnd = cut.endRatio * totalRawDuration
            gainNode.gain.setValueAtTime(0, cStart)
            gainNode.gain.setValueAtTime(baseVolume, cEnd)
          })
        }

        source.connect(gainNode)
        gainNode.connect(offlineCtx.destination)
        source.start(0)
      })

      setExportProgressText("Rendering multi-track audio...")
      const renderedBuffer = await offlineCtx.startRendering()

      if (normalizeExport) {
        setExportProgressText("Normalizing master peak levels (0 dBFS)...")
        let maxPeak = 0
        for (let ch = 0; ch < renderedBuffer.numberOfChannels; ch++) {
          const data = renderedBuffer.getChannelData(ch)
          for (let i = 0; i < data.length; i++) {
            const abs = Math.abs(data[i])
            if (abs > maxPeak) maxPeak = abs
          }
        }
        if (maxPeak > 0 && maxPeak < 0.99) {
          const normFactor = 0.98 / maxPeak
          for (let ch = 0; ch < renderedBuffer.numberOfChannels; ch++) {
            const data = renderedBuffer.getChannelData(ch)
            for (let i = 0; i < data.length; i++) data[i] *= normFactor
          }
        }
      }

      setExportProgressText("Encoding lossless master WAV file...")
      const wavBlob = audioBufferToWav(renderedBuffer)
      downloadBlob(wavBlob, `${space.name}_Master_Mixdown.wav`)

      setExportProgressText("Master Mixdown Ready!")
      setTimeout(() => {
        setIsRenderingMaster(false)
        setIsExportOpen(false)
        setExportProgressText("")
      }, 1000)
    } catch (err: any) {
      console.error("Master export error:", err)
      alert(`Master Export Error: ${err?.message || "Failed to render mixdown"}`)
      setIsRenderingMaster(false)
      setExportProgressText("")
    }
  }

  const handleBatchExportStems = async () => {
    for (const stem of profile.stems) {
      await handleDownloadTrack(stem)
      await new Promise((r) => setTimeout(r, 450))
    }
  }

  const activeStemEdit = trackEdits[activeStemId]
  const activeStemInfo = STEMS[activeStemId]

  return (
    <div className="space-y-4">
      {/* Hidden synchronized audio elements */}
      {profile.stems.map((stem) => {
        const rawUrl = space.stemUrls?.[stem] || (space.jobId ? getStemStreamUrl(space.jobId, stem) : null)
        const stemUrl = resolveAudioUrl(rawUrl)
        if (!stemUrl) return null
        return (
          <audio
            key={`${space.id}-${stem}`}
            ref={(el) => {
              audioRefs.current[stem] = el
              if (el) {
                if (stemUrl && (!el.src || el.src === "" || !el.src.includes(stemUrl))) {
                  el.src = stemUrl
                }
                const audible = isStemAudibleAtTime(stem, time)
                const s = stemState[stem] || { mute: false, solo: false, volume: 80 }
                el.volume = audible ? (master / 100) * (s.volume / 100) : 0
                el.playbackRate = 1.0
              }
            }}
            src={stemUrl}
            preload="auto"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration
              if (d && Number.isFinite(d) && d > 0 && Math.abs(d - duration) > 2) {
                setDuration(Math.round(d))
              }
              const audible = isStemAudibleAtTime(stem, time)
              const s = stemState[stem] || { mute: false, solo: false, volume: 80 }
              e.currentTarget.volume = audible ? (master / 100) * (s.volume / 100) : 0
            }}
            onTimeUpdate={(e) => {
              if (stem === profile.stems[0]) {
                const cur = e.currentTarget.currentTime
                setTime(cur)
                syncTrackVolumes(cur)
              }
            }}
            onEnded={() => {
              if (stem === profile.stems[0]) {
                setPlaying(false)
              }
            }}
          >
            <source src={stemUrl} type="audio/wav" />
          </audio>
        )
      })}

      <StepHeading
        eyebrow="Step 4 of 4 &bull; Studio Mixer"
        title="Multi-track studio workstation"
        description="Non-destructive, track-isolated editing: split, trim, and delete audio segments independently on every channel with full Undo / Redo history."
      />

      {/* TOP TRANSPORT & READ-ONLY METADATA BAR */}
      <div className="glass-panel-soft flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 md:p-4">
        {/* Playback Controls & Time */}
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={togglePlay}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label={playing ? "Pause mix (Space)" : "Play mix (Space)"}
            title={playing ? "Pause (Space)" : "Play (Space)"}
            className="glow-gold flex size-11 items-center justify-center rounded-full bg-white text-[#1f3a27] shadow-lg focus-visible:outline-2 focus-visible:outline-ring"
          >
            {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="ml-0.5 size-5" fill="currentColor" />}
          </motion.button>
          <button
            type="button"
            onClick={() => seek(0)}
            aria-label="Return to start"
            title="Return to start (00:00)"
            className="flex size-9 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white transition"
          >
            <RotateCcw className="size-4" />
          </button>
          <div className="border-l border-white/15 pl-3">
            <div className="font-mono text-base font-bold tabular-nums tracking-tight text-white">
              {formatTime(time)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/50">
              / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* Read-Only Detected Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Detected Tempo Badge (Read-Only) */}
          <div
            className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-1.5 ring-1 ring-white/15"
            title="Automatically detected project tempo (Read-only)"
          >
            <Clock className="size-3.5 text-[#ffe29a]" />
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-white/50">Detected Tempo</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs font-bold text-white">{detectedBpm}</span>
                <span className="text-[10px] text-white/60">BPM</span>
              </div>
            </div>
          </div>

          {/* Detected Key / Tune Badge (Read-Only) */}
          <div
            className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-1.5 ring-1 ring-white/15"
            title="Automatically detected musical key & scale (Read-only)"
          >
            <Music className="size-3.5 text-cyan-300" />
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-white/50">Musical Key</span>
              <span className="font-mono text-xs font-bold text-white">{detectedKey}</span>
            </div>
          </div>

          {/* Time Signature / Audio Spec Badge */}
          <div className="hidden sm:flex items-center gap-2 rounded-xl bg-black/40 px-3 py-1.5 ring-1 ring-white/15 text-white/60">
            <span className="font-mono text-[11px] font-semibold text-white/80">4/4</span>
            <span className="text-[10px] text-white/40">&bull;</span>
            <span className="font-mono text-[11px]">44.1kHz 24-bit</span>
          </div>
        </div>

        {/* Master Volume & Export Modal Button */}
        <div className="flex items-center gap-3">
          <div className="flex w-32 items-center gap-2">
            <Volume2 className="size-4 shrink-0 text-white/70" />
            <Range label="Master volume" value={master} onChange={setMaster} />
          </div>
          <motion.button
            type="button"
            onClick={() => setIsExportOpen(true)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-[#ffe29a] px-3.5 py-2 text-xs font-bold text-stone-950 shadow-[0_0_20px_rgba(255,226,154,0.35)] hover:brightness-105 transition"
          >
            <Disc className="size-4" />
            <span>Export Master</span>
          </motion.button>
        </div>
      </div>

      {/* TRACK-LEVEL EDITING CONTROLS TOOLBAR WITH COMMAND HISTORY */}
      <div className="glass-panel-soft flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs">
        {/* Undo / Redo & Tool Selection */}
        <div className="flex items-center gap-1.5">
          {/* History Undo / Redo Buttons */}
          <div className="flex items-center gap-1 border-r border-white/15 pr-2">
            <button
              type="button"
              disabled={historyPast.length === 0}
              onClick={handleUndo}
              className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-white/80 transition hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              title="Undo last action (Ctrl+Z)"
            >
              <Undo2 className="size-3.5" />
              <span className="text-[11px]">Undo</span>
            </button>
            <button
              type="button"
              disabled={historyFuture.length === 0}
              onClick={handleRedo}
              className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-white/80 transition hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              title="Redo action (Ctrl+Y or Ctrl+Shift+Z)"
            >
              <Redo2 className="size-3.5" />
              <span className="text-[11px]">Redo</span>
            </button>
          </div>

          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Tools:</span>
          <button
            type="button"
            onClick={() => setToolMode("pointer")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition",
              toolMode === "pointer"
                ? "bg-white text-stone-950 shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
            title="Pointer / Scrub tool (P)"
          >
            <span>Pointer (P)</span>
          </button>
          <button
            type="button"
            onClick={() => setToolMode("range")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition",
              toolMode === "range"
                ? "bg-[#ffe29a] text-stone-950 shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
            title="Range Selection: Drag over any track to select an isolated region (R)"
          >
            <Crop className="size-3.5" />
            <span>Select Range (R)</span>
          </button>
          <button
            type="button"
            onClick={() => setToolMode("split")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition",
              toolMode === "split"
                ? "bg-cyan-400 text-stone-950 shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
            title="Scissors: Click on any track's waveform to slice into regions (S)"
          >
            <Scissors className="size-3.5" />
            <span>Scissors (S)</span>
          </button>
          <button
            type="button"
            onClick={() => setToolMode("delete")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition",
              toolMode === "delete"
                ? "bg-red-400 text-stone-950 shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
            title="Eraser: Click on a silenced cut region to remove the cut (D)"
          >
            <Trash2 className="size-3.5" />
            <span>Eraser (D)</span>
          </button>
        </div>

        {/* Targeted Track Action Bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-black/40 px-2.5 py-1 ring-1 ring-white/15">
            <span className="text-[11px] text-white/50">Targeted Track:</span>
            <span className="size-2 rounded-full" style={{ backgroundColor: activeStemInfo.color }} />
            <span className="font-semibold text-white">{activeStemInfo.label}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleTrackSplitAtPlayhead(activeStemId)}
              className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 font-medium text-white/80 hover:bg-white/20 hover:text-white transition"
              title={`Split ${activeStemInfo.label} clip at current playhead position`}
            >
              <Scissors className="size-3" />
              <span>Split at Playhead</span>
            </button>
            <button
              type="button"
              disabled={!activeStemEdit?.selection}
              onClick={() => handleTrackTrimToSelection(activeStemId)}
              className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 font-medium text-white/80 hover:bg-white/20 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none"
              title={`Trim ${activeStemInfo.label} to its selected range`}
            >
              <Crop className="size-3" />
              <span>Trim to Selection</span>
            </button>
            <button
              type="button"
              disabled={!activeStemEdit?.selection}
              onClick={() => handleTrackDeleteSelection(activeStemId)}
              className="flex items-center gap-1 rounded-md bg-red-500/20 px-2.5 py-1 font-medium text-red-200 hover:bg-red-500/30 transition disabled:opacity-40 disabled:pointer-events-none"
              title={`Silence / cut selected segment on ${activeStemInfo.label} (Delete / Backspace)`}
            >
              <Trash2 className="size-3" />
              <span>Cut Segment (Del)</span>
            </button>
            {(activeStemEdit?.trim.startRatio > 0 ||
              activeStemEdit?.trim.endRatio < 1 ||
              activeStemEdit?.cuts.length > 0 ||
              activeStemEdit?.splits.length > 0) && (
              <button
                type="button"
                onClick={() => handleTrackReset(activeStemId)}
                className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-white/60 hover:bg-white/20 hover:text-white transition"
                title={`Reset ${activeStemInfo.label} edits back to original`}
              >
                <RotateCcw className="size-3" />
                <span>Reset Track</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* INDEPENDENT STEM CHANNELS RACK & ISOLATED WAVEFORMS */}
      <div className="glass-scroll overflow-x-auto">
        <div className="min-w-[560px] space-y-2">
          {/* Timeline Header Ruler */}
          <div className={ROW_GRID} aria-hidden="true">
            <span className="self-end text-xs font-semibold uppercase tracking-wider text-white/60">
              Channels ({profile.count} Stems)
            </span>
            <div className="relative h-5">
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute top-0 -translate-x-1/2 font-mono text-[10px] tabular-nums text-white/60 first:translate-x-0"
                  style={{ left: `${(t / duration) * 100}%` }}
                >
                  {formatTime(t)}
                </span>
              ))}
            </div>
          </div>

          {/* Stem Track Rows */}
          {profile.stems.map((stem, i) => {
            const info = STEMS[stem]
            const s = stemState[stem] || { mute: false, solo: false, volume: 80 }
            const audible = isStemAudibleAtTime(stem, time)
            const isDownloadingThis = downloading === stem
            const isDownloadedThis = downloaded === stem
            const isTargeted = activeStemId === stem
            const edit = trackEdits[stem]

            const isTrimmed = edit.trim.startRatio > 0 || edit.trim.endRatio < 1
            const hasCuts = edit.cuts.length > 0
            const hasSplits = edit.splits.length > 0

            return (
              <motion.div
                key={stem}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 22, delay: i * 0.05 }}
                className={cn(ROW_GRID, "h-[102px]")}
                onClick={() => setActiveStemId(stem)}
              >
                {/* Left Channel Strip */}
                <div
                  className={cn(
                    "glass-panel-soft flex flex-col justify-between rounded-xl p-2.5 transition-all cursor-pointer",
                    !audible && "opacity-50",
                    isTargeted ? "ring-1 ring-[#ffe29a]/60 shadow-[0_0_15px_rgba(255,226,154,0.15)]" : "ring-white/10",
                  )}
                  style={audible && playing ? { boxShadow: `0 0 22px ${info.color}45, inset 1px 1px 0 rgba(255,255,255,0.2)` } : undefined}
                >
                  {/* Stem Title & Status Chips */}
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-1 shrink-0 rounded-full" style={{ backgroundColor: info.color }} />
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-white">{info.label}</span>

                    {/* Status Badges */}
                    {isTrimmed && (
                      <span className="rounded bg-amber-400/20 px-1 py-0.5 text-[9px] font-mono text-amber-300">
                        Trimmed
                      </span>
                    )}
                    {hasCuts && (
                      <span className="rounded bg-red-400/20 px-1 py-0.5 text-[9px] font-mono text-red-300">
                        {edit.cuts.length} cuts
                      </span>
                    )}

                    {/* Mute & Solo */}
                    <button
                      type="button"
                      aria-pressed={s.mute}
                      aria-label={`Mute ${info.label}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        updateStemState(stem, { mute: !s.mute })
                      }}
                      className={cn(
                        "flex size-6 items-center justify-center rounded-md text-[11px] font-bold ring-1 transition-colors",
                        s.mute ? "bg-red-400 text-red-950 ring-red-300" : "text-white/70 ring-white/25 hover:bg-white/15 hover:text-white",
                      )}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      aria-pressed={s.solo}
                      aria-label={`Solo ${info.label}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        updateStemState(stem, { solo: !s.solo })
                      }}
                      className={cn(
                        "flex size-6 items-center justify-center rounded-md text-[11px] font-bold ring-1 transition-colors",
                        s.solo ? "bg-[#ffe29a] text-[#2d3a1f] ring-[#ffe29a]" : "text-white/70 ring-white/25 hover:bg-white/15 hover:text-white",
                      )}
                    >
                      S
                    </button>
                  </div>

                  {/* Channel Mini Action Toolbar */}
                  <div className="flex items-center justify-between gap-1 border-t border-white/10 pt-1 text-[10px] text-white/60">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveStemId(stem)
                          handleTrackSplitAtPlayhead(stem)
                        }}
                        className="rounded p-1 hover:bg-white/15 hover:text-white transition"
                        title="Split this track at current playhead"
                      >
                        <Scissors className="size-3" />
                      </button>
                      <button
                        type="button"
                        disabled={!edit.selection}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveStemId(stem)
                          handleTrackTrimToSelection(stem)
                        }}
                        className="rounded p-1 hover:bg-white/15 hover:text-white transition disabled:opacity-30"
                        title="Trim this track to selection"
                      >
                        <Crop className="size-3" />
                      </button>
                      <button
                        type="button"
                        disabled={!edit.selection}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveStemId(stem)
                          handleTrackDeleteSelection(stem)
                        }}
                        className="rounded p-1 hover:bg-red-400/20 hover:text-red-300 transition disabled:opacity-30"
                        title="Delete selected range on this track"
                      >
                        <Trash2 className="size-3" />
                      </button>
                      {(isTrimmed || hasCuts || hasSplits) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTrackReset(stem)
                          }}
                          className="rounded p-1 hover:bg-white/15 hover:text-white transition"
                          title="Reset track edits"
                        >
                          <RotateCcw className="size-3" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      aria-label={`Download ${info.label} stem WAV`}
                      title="Download isolated edited stem (WAV)"
                      disabled={isDownloadingThis}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownloadTrack(stem)
                      }}
                      className={cn(
                        "flex items-center gap-1 rounded px-1.5 py-0.5 ring-1 ring-white/15 hover:bg-white/15 hover:text-white transition disabled:opacity-50",
                        isDownloadedThis && "bg-emerald-400 text-emerald-950 ring-emerald-300",
                      )}
                    >
                      {isDownloadedThis ? (
                        <Check className="size-3" strokeWidth={3} />
                      ) : isDownloadingThis ? (
                        <div className="size-2.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="size-3" />
                      )}
                      <span>WAV</span>
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <Range
                        label={`${info.label} volume`}
                        value={s.volume}
                        color={info.color}
                        onChange={(volume) => updateStemState(stem, { volume })}
                      />
                    </div>
                    <span className="w-5 text-right font-mono text-[10px] tabular-nums text-white/70">{s.volume}</span>
                  </div>
                </div>

                {/* Right Isolated Waveform Track */}
                <Waveform
                  peaks={peaks[stem]}
                  color={info.color}
                  progress={progress}
                  audible={audible}
                  volume={s.volume}
                  toolMode={toolMode}
                  isActive={isTargeted}
                  selection={edit.selection}
                  trim={edit.trim}
                  cuts={edit.cuts}
                  splits={edit.splits}
                  onTrackClick={() => setActiveStemId(stem)}
                  onSeek={(ratio) => seek(ratio * duration)}
                  onSelectRange={(startRatio, endRatio) => handleTrackSelectRange(stem, startRatio, endRatio)}
                  onSplitClick={(ratio) => handleTrackSplitClick(stem, ratio)}
                  onDeleteSegment={(cutId) => handleTrackDeleteCut(stem, cutId)}
                />
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* FOOTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Shortcuts: Space (Play/Pause) &bull; Ctrl+Z (Undo) &bull; Ctrl+Y (Redo) &bull; Del (Cut) &bull; P/R/S/D (Tools)</span>
        </div>
        <GhostButton onClick={onRerun}>
          <Layers className="size-4" />
          Re-run with another profile
        </GhostButton>
      </div>

      {/* MASTER & STEM EXPORT MODAL */}
      <AnimatePresence>
        {isExportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isRenderingMaster && setIsExportOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-neutral-950/90 p-6 shadow-2xl backdrop-blur-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[#ffe29a]/20 text-[#ffe29a] ring-1 ring-[#ffe29a]/30">
                    <Disc className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Studio Export Center</h3>
                    <p className="text-xs text-white/60">Export master mixdown or individual edited audio stems</p>
                  </div>
                </div>
                {!isRenderingMaster && (
                  <button
                    type="button"
                    onClick={() => setIsExportOpen(false)}
                    className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>

              {/* Options & Settings */}
              <div className="mt-6 space-y-4">
                <div className="space-y-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white/80">Audio Format</span>
                    <div className="flex items-center gap-1 rounded-lg bg-black/40 p-1">
                      <button
                        type="button"
                        onClick={() => setExportFormat("wav")}
                        className={cn(
                          "rounded-md px-2.5 py-1 font-mono font-semibold transition",
                          exportFormat === "wav" ? "bg-[#ffe29a] text-black" : "text-white/60 hover:text-white",
                        )}
                      >
                        WAV (Lossless PCM)
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportFormat("mp3")}
                        className={cn(
                          "rounded-md px-2.5 py-1 font-mono font-semibold transition",
                          exportFormat === "mp3" ? "bg-[#ffe29a] text-black" : "text-white/60 hover:text-white",
                        )}
                      >
                        MP3 (320kbps)
                      </button>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center justify-between text-xs text-white/80">
                    <span>Apply Track-Isolated Edits (Trims & Cuts)</span>
                    <input
                      type="checkbox"
                      checked={applyEditsInExport}
                      onChange={(e) => setApplyEditsInExport(e.target.checked)}
                      className="size-4 rounded accent-[#ffe29a]"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between text-xs text-white/80">
                    <span>Normalize Peak Headroom (0 dBFS)</span>
                    <input
                      type="checkbox"
                      checked={normalizeExport}
                      onChange={(e) => setNormalizeExport(e.target.checked)}
                      className="size-4 rounded accent-[#ffe29a]"
                    />
                  </label>
                </div>

                {/* Progress bar during rendering */}
                {isRenderingMaster && (
                  <div className="space-y-2 rounded-2xl bg-amber-400/10 p-4 ring-1 ring-amber-400/30">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                      <span>{exportProgressText || "Rendering multi-track audio..."}</span>
                      <div className="size-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-2/3 bg-gradient-to-r from-amber-400 to-[#ffe29a] animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Export Action Buttons */}
                <div className="grid gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isRenderingMaster}
                    onClick={handleExportMaster}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-[#ffe29a] py-3 text-sm font-bold text-stone-950 shadow-[0_0_25px_rgba(255,226,154,0.4)] hover:brightness-105 transition disabled:opacity-50"
                  >
                    <Disc className="size-4" />
                    <span>Render & Download Master Mixdown</span>
                  </button>

                  <button
                    type="button"
                    disabled={isRenderingMaster}
                    onClick={handleBatchExportStems}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-2.5 text-xs font-semibold text-white/90 hover:bg-white/20 transition disabled:opacity-50"
                  >
                    <Download className="size-4" />
                    <span>Download All Separated Stems</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
