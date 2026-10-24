"use client"

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import type { Track } from "@/components/music-box/types"
import { DEMO_TRACKS } from "@/lib/demo-tracks"
import { fetchMusicBoxTracks, fetchJobs, uploadAudioJob, getJobStatus } from "@/lib/api"
import {
  extractStemUrls,
  resolveAudioUrl,
  PROFILES,
  type ProfileId,
  type Space,
  type StepNumber,
} from "@/lib/stems"
import { getAudioDuration, getExtension, stripExtension } from "@/lib/format"

const ACCEPTED_EXTENSIONS = ["mp3", "wav", "flac"]
const MAX_SIZE = 200 * 1024 * 1024
const TICK_MS = 400
const SPEED: Record<ProfileId, number> = { "2": 1.4, "4": 1, "6": 0.75 }

const INITIAL_SPACES: Space[] = [
  {
    id: "ae40d8e5-3e82-428b-9822-be3f0dec142b",
    name: "Hằng ssi - THÍCH ANH CƠ (4 Stems)",
    artist: "Hằng ssi Ft. Aries tis • Demucs",
    ext: "mp3",
    size: 16576468,
    sizeEstimated: false,
    duration: 188,
    src: "/api/stems/ae40d8e5-3e82-428b-9822-be3f0dec142b/vocals.wav",
    ownsSrc: false,
    cover: "/music-1.jpg",
    profile: "4",
    status: "ready",
    progress: 100,
    step: 4,
    reached: 4,
    createdLabel: "4 Stems Ready",
    jobId: "ae40d8e5-3e82-428b-9822-be3f0dec142b",
    stemUrls: {
      vocals: "/api/stems/ae40d8e5-3e82-428b-9822-be3f0dec142b/vocals.wav",
      drums: "/api/stems/ae40d8e5-3e82-428b-9822-be3f0dec142b/drums.wav",
      bass: "/api/stems/ae40d8e5-3e82-428b-9822-be3f0dec142b/bass.wav",
      other: "/api/stems/ae40d8e5-3e82-428b-9822-be3f0dec142b/other.wav",
    },
  },
  {
    id: "1bdbaec6-deb2-4ee6-ad8f-f075dc170d41",
    name: "NHẤT BÁI THIÊN ĐỊA (6 Stems Pro)",
    artist: "The Flob (prod. CHIN) • Demucs 6s",
    ext: "mp3",
    size: 73101612,
    sizeEstimated: false,
    duration: 414,
    src: "/api/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/vocals.wav",
    ownsSrc: false,
    cover: "/music-1.jpg",
    profile: "6",
    status: "ready",
    progress: 100,
    step: 4,
    reached: 4,
    createdLabel: "6 Stems Ready",
    jobId: "1bdbaec6-deb2-4ee6-ad8f-f075dc170d41",
    stemUrls: {
      vocals: "/api/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/vocals.wav",
      drums: "/api/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/drums.wav",
      bass: "/api/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/bass.wav",
      guitar: "/api/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/guitar.wav",
      piano: "/api/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/piano.wav",
      other: "/api/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/other.wav",
    },
  },
]

type NewSpaceInput = Pick<
  Space,
  "name" | "artist" | "ext" | "size" | "sizeEstimated" | "duration" | "src" | "ownsSrc" | "cover" | "file"
>

export type StudioContextType = {
  // Music Box
  tracks: Track[]
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>

  // Stem Studio
  spaces: Space[]
  setSpaces: React.Dispatch<React.SetStateAction<Space[]>>
  activeSpaceId: string | null
  setActiveSpaceId: (id: string | null) => void
  activeSpace: Space | undefined
  patchSpace: (id: string, changes: Partial<Space>) => void
  createSpaceFromUpload: (file: File) => Promise<string | null>
  createSpaceFromTrack: (track: Track) => Promise<string | null>
  deleteSpace: (id: string) => void
  startSeparationForActive: () => Promise<void>
  cancelSeparationForActive: () => void
  error: string | null
  setError: (err: string | null) => void
  ensureSpaceLoaded: (id: string) => Promise<Space | null>
}

const StudioContext = createContext<StudioContextType | null>(null)

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>(DEMO_TRACKS)
  const [spaces, setSpaces] = useState<Space[]>(INITIAL_SPACES)
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>("ae40d8e5-3e82-428b-9822-be3f0dec142b")
  const [error, setError] = useState<string | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const spacesRef = useRef(spaces)

  useEffect(() => {
    spacesRef.current = spaces
  }, [spaces])

  const showError = useCallback((msg: string) => {
    setError(msg)
    clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setError(null), 4500)
  }, [])

  // 1. Initial Load: Music Box Tracks from Spring Boot Backend
  useEffect(() => {
    fetchMusicBoxTracks()
      .then((mbTracks) => {
        if (mbTracks && mbTracks.length > 0) {
          const loaded: Track[] = mbTracks.map((t) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            album: t.album,
            duration: t.durationSeconds || 180,
            source: "musicbox",
            src: resolveAudioUrl(t.audioUrl),
            cover: t.coverUrl?.trim(),
            genre: t.genre,
            size: t.fileSizeBytes,
          }))
          setTracks(loaded)
        }
      })
      .catch((err) => console.warn("Failed to fetch music box tracks:", err))
  }, [])

  // 2. Initial Load: Separation Jobs from Spring Boot Backend
  useEffect(() => {
    fetchJobs()
      .then((jobs) => {
        if (!jobs || jobs.length === 0) return
        const backendSpaces: Space[] = jobs.map((j) => {
          const profileId: ProfileId =
            j.modelName === "htdemucs_2s" ? "2" : j.modelName === "htdemucs_6s" ? "6" : "4"
          const isReady = j.status === "SUCCEEDED"
          return {
            id: j.id,
            name: j.originalFilename.replace(/\.[^/.]+$/, ""),
            artist: j.modelName ? `Demucs (${j.modelName})` : "Veetoma Studio",
            ext: "wav",
            size: 73101612,
            sizeEstimated: false,
            duration: 188,
            src: resolveAudioUrl(j.vocalsUrl || j.inputFileUrl),
            ownsSrc: false,
            cover: "/music-1.jpg",
            profile: profileId,
            status: isReady ? "ready" : j.status === "FAILED" ? "failed" : "processing",
            progress: isReady ? 100 : 50,
            step: isReady ? 4 : 3,
            reached: isReady ? 4 : 3,
            createdLabel: isReady ? `${PROFILES[profileId].count} Stems Ready` : "In Progress",
            jobId: j.id,
            job: j,
            stemUrls: extractStemUrls(j),
            errorMessage: j.errorMessage,
          }
        })
        setSpaces((prev) => {
          const backendIds = new Set(backendSpaces.map((s) => s.id))
          const existing = prev.filter((s) => !backendIds.has(s.id))
          return [...backendSpaces, ...existing]
        })
      })
      .catch((err) => console.warn("Failed to fetch separation jobs:", err))
  }, [])

  const patchSpace = useCallback((id: string, changes: Partial<Space>) => {
    setSpaces((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)))
  }, [])

  // 3. Background Polling for active separation jobs
  useEffect(() => {
    const processingSpaces = spaces.filter((s) => s.status === "processing" && s.jobId)
    if (processingSpaces.length === 0) return

    const interval = setInterval(async () => {
      for (const space of processingSpaces) {
        if (!space.jobId) continue
        try {
          const updatedJob = await getJobStatus(space.jobId)
          if (updatedJob.status === "SUCCEEDED") {
            const urls = extractStemUrls(updatedJob)
            patchSpace(space.id, {
              status: "ready",
              progress: 100,
              reached: 4,
              step: 4,
              job: updatedJob,
              stemUrls: urls,
            })
          } else if (updatedJob.status === "FAILED") {
            patchSpace(space.id, {
              status: "failed",
              errorMessage: updatedJob.errorMessage || "Demucs AI separation failed on worker",
              job: updatedJob,
            })
          } else if (updatedJob.status === "RUNNING") {
            patchSpace(space.id, {
              progress: Math.min(92, Math.max(35, space.progress + 6)),
              job: updatedJob,
            })
          }
        } catch (pollErr) {
          console.warn(`Polling error for space ${space.id}:`, pollErr)
        }
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [spaces, patchSpace])

  // Fallback simulation for local/demo spaces without jobId
  useEffect(() => {
    const localProcessing = spaces.some((s) => s.status === "processing" && !s.jobId)
    if (!localProcessing) return

    const id = setInterval(() => {
      setSpaces((prev) =>
        prev.map((s) => {
          if (s.status !== "processing" || s.jobId) return s
          const next = s.progress + (0.7 + Math.random() * 0.8) * SPEED[s.profile]
          if (next < 100) return { ...s, progress: next }
          return { ...s, progress: 100, status: "ready", reached: 4, step: 4 }
        }),
      )
    }, TICK_MS)

    return () => clearInterval(id)
  }, [spaces])

  const createSpace = useCallback((input: NewSpaceInput): Space => {
    return {
      ...input,
      id: crypto.randomUUID(),
      profile: "4",
      status: "draft",
      progress: 0,
      step: 1,
      reached: 1,
      createdLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  }, [])

  const createSpaceFromUpload = useCallback(
    async (file: File): Promise<string | null> => {
      const ext = getExtension(file.name)
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        showError("Unsupported format. Use MP3, WAV or FLAC.")
        return null
      }
      if (file.size > MAX_SIZE) {
        showError("File is larger than 200 MB.")
        return null
      }
      setError(null)
      const duration = await getAudioDuration(file)
      const newSpace = createSpace({
        name: stripExtension(file.name),
        artist: "Uploaded file",
        ext,
        size: file.size,
        sizeEstimated: false,
        duration,
        src: URL.createObjectURL(file),
        ownsSrc: true,
        file,
        cover: "/music-1.jpg",
      })
      setSpaces((prev) => [newSpace, ...prev])
      setActiveSpaceId(newSpace.id)
      return newSpace.id
    },
    [createSpace, showError],
  )

  const createSpaceFromTrack = useCallback(
    async (track: Track): Promise<string | null> => {
      setError(null)
      const newSpace = createSpace({
        name: track.title,
        artist: track.artist,
        ext: track.ext ?? "mp3",
        size: track.size ?? 0,
        sizeEstimated: track.source === "demo",
        duration: track.duration,
        src: track.src,
        ownsSrc: false,
        cover: track.cover,
      })
      setSpaces((prev) => [newSpace, ...prev])
      setActiveSpaceId(newSpace.id)
      return newSpace.id
    },
    [createSpace],
  )

  const deleteSpace = useCallback(
    (id: string) => {
      const target = spaces.find((s) => s.id === id)
      if (target?.ownsSrc && target.src) URL.revokeObjectURL(target.src)
      setSpaces((prev) => prev.filter((s) => s.id !== id))
      if (activeSpaceId === id) setActiveSpaceId(null)
    },
    [spaces, activeSpaceId],
  )

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0]

  const startSeparationForActive = useCallback(async () => {
    if (!activeSpace) return
    patchSpace(activeSpace.id, {
      status: "processing",
      progress: 8,
      step: 3,
      reached: 3,
      errorMessage: null,
    })

    try {
      let fileToUpload = activeSpace.file
      if (!fileToUpload && activeSpace.src) {
        try {
          const res = await fetch(activeSpace.src)
          const blob = await res.blob()
          fileToUpload = new File([blob], `${activeSpace.name}.${activeSpace.ext || "wav"}`, {
            type: blob.type || "audio/wav",
          })
        } catch {
          // Cross-origin fetch fallback
        }
      }

      if (!fileToUpload) {
        showError("No audio file found to upload.")
        patchSpace(activeSpace.id, {
          status: "failed",
          errorMessage: "Missing audio file for backend separation",
        })
        return
      }

      const job = await uploadAudioJob(fileToUpload, activeSpace.profile)
      patchSpace(activeSpace.id, {
        jobId: job.id,
        job,
        progress: 18,
        status: job.status === "SUCCEEDED" ? "ready" : "processing",
        stemUrls: extractStemUrls(job),
        reached: job.status === "SUCCEEDED" ? 4 : 3,
        step: job.status === "SUCCEEDED" ? 4 : 3,
      })
    } catch (err: any) {
      console.error("Separation start failed:", err)
      patchSpace(activeSpace.id, {
        status: "failed",
        errorMessage: err?.message || "Failed to communicate with Spring Boot backend",
      })
      showError(err?.message || "Separation request failed")
    }
  }, [activeSpace, patchSpace, showError])

  const cancelSeparationForActive = useCallback(() => {
    if (!activeSpace) return
    patchSpace(activeSpace.id, { status: "draft", progress: 0, step: 2, reached: 2 })
  }, [activeSpace, patchSpace])

  const ensureSpaceLoaded = useCallback(
    async (id: string): Promise<Space | null> => {
      const existing = spacesRef.current.find((s) => s.id === id)
      if (existing) {
        setActiveSpaceId(id)
        return existing
      }

      // Fetch job by ID from Core API
      try {
        const job = await getJobStatus(id)
        if (job) {
          const profileId: ProfileId =
            job.modelName === "htdemucs_2s" ? "2" : job.modelName === "htdemucs_6s" ? "6" : "4"
          const isReady = job.status === "SUCCEEDED"
          const newSpace: Space = {
            id: job.id,
            name: job.originalFilename.replace(/\.[^/.]+$/, ""),
            artist: job.modelName ? `Demucs (${job.modelName})` : "Veetoma Studio",
            ext: "wav",
            size: 73101612,
            sizeEstimated: false,
            duration: 188,
            src: resolveAudioUrl(job.vocalsUrl || job.inputFileUrl),
            ownsSrc: false,
            cover: "/music-1.jpg",
            profile: profileId,
            status: isReady ? "ready" : job.status === "FAILED" ? "failed" : "processing",
            progress: isReady ? 100 : 50,
            step: isReady ? 4 : 3,
            reached: isReady ? 4 : 3,
            createdLabel: isReady ? `${PROFILES[profileId].count} Stems Ready` : "In Progress",
            jobId: job.id,
            job,
            stemUrls: extractStemUrls(job),
            errorMessage: job.errorMessage,
          }
          setSpaces((prev) => [newSpace, ...prev.filter((s) => s.id !== id)])
          setActiveSpaceId(id)
          return newSpace
        }
      } catch (err) {
        console.warn(`Could not load space ${id} from Core API:`, err)
      }
      return null
    },
    [],
  )

  const value: StudioContextType = {
    tracks,
    setTracks,
    spaces,
    setSpaces,
    activeSpaceId,
    setActiveSpaceId,
    activeSpace,
    patchSpace,
    createSpaceFromUpload,
    createSpaceFromTrack,
    deleteSpace,
    startSeparationForActive,
    cancelSeparationForActive,
    error,
    setError,
    ensureSpaceLoaded,
  }

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}

export function useStudio() {
  const context = useContext(StudioContext)
  if (!context) {
    throw new Error("useStudio must be used within a StudioProvider")
  }
  return context
}
