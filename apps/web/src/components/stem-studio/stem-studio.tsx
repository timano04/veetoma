"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence } from "motion/react"
import type { Track } from "@/components/music-box/types"
import { getAudioDuration, getExtension, stripExtension } from "@/lib/format"
import { extractStemUrls, resolveAudioUrl, PROFILES, type ProfileId, type Space, type StepNumber } from "@/lib/stems"
import { uploadAudioJob, getJobStatus, fetchJobs, prewarmWorker } from "@/lib/api"
import { SpaceGallery } from "./space-gallery"
import { SpaceView } from "./space-view"

const ACCEPTED_EXTENSIONS = ["mp3", "wav", "flac"]
const MAX_SIZE = 200 * 1024 * 1024
const TICK_MS = 400
const SPEED: Record<ProfileId, number> = { "2": 1.4, "4": 1, "6": 0.75 }

const SAMPLE_SPACES: Space[] = [
  {
    id: "8e7a5cc0-aa7a-4fcb-ab49-99c1d08241bc",
    name: "Hằng ssi - THÍCH ANH CƠ (4 Stems)",
    artist: "Hằng ssi Ft. Aries tis • Demucs",
    ext: "mp3",
    size: 16576468,
    sizeEstimated: false,
    duration: 188,
    src: "http://localhost:8080/api/files/stems/8e7a5cc0-aa7a-4fcb-ab49-99c1d08241bc/vocals.wav",
    ownsSrc: false,
    cover: "/music-1.jpg",
    profile: "4",
    status: "ready",
    progress: 100,
    step: 4,
    reached: 4,
    createdLabel: "4 Stems Ready",
    jobId: "8e7a5cc0-aa7a-4fcb-ab49-99c1d08241bc",
    stemUrls: {
      vocals: "http://localhost:8080/api/files/stems/8e7a5cc0-aa7a-4fcb-ab49-99c1d08241bc/vocals.wav",
      drums: "http://localhost:8080/api/files/stems/8e7a5cc0-aa7a-4fcb-ab49-99c1d08241bc/drums.wav",
      bass: "http://localhost:8080/api/files/stems/8e7a5cc0-aa7a-4fcb-ab49-99c1d08241bc/bass.wav",
      other: "http://localhost:8080/api/files/stems/8e7a5cc0-aa7a-4fcb-ab49-99c1d08241bc/other.wav",
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
    src: "http://localhost:8080/api/files/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/vocals.wav",
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
      vocals: "http://localhost:8080/api/files/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/vocals.wav",
      drums: "http://localhost:8080/api/files/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/drums.wav",
      bass: "http://localhost:8080/api/files/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/bass.wav",
      guitar: "http://localhost:8080/api/files/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/guitar.wav",
      piano: "http://localhost:8080/api/files/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/piano.wav",
      other: "http://localhost:8080/api/files/stems/1bdbaec6-deb2-4ee6-ad8f-f075dc170d41/other.wav",
    },
  },
]

type NewSpace = Pick<
  Space,
  "name" | "artist" | "ext" | "size" | "sizeEstimated" | "duration" | "src" | "ownsSrc" | "cover" | "file"
>

function createSpace(input: NewSpace): Space {
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
}

export default function StemStudio({ tracks = [] }: { tracks?: Track[] } = {}) {
  const [spaces, setSpaces] = useState<Space[]>(SAMPLE_SPACES)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const spacesRef = useRef(spaces)

  useEffect(() => {
    spacesRef.current = spaces
  }, [spaces])

  useEffect(
    () => () => {
      clearTimeout(errorTimer.current)
      spacesRef.current.forEach((s) => s.ownsSrc && s.src && URL.revokeObjectURL(s.src))
    },
    [],
  )

  // Silently trigger background pre-warm of Modal GPU worker as soon as user opens Stem Studio
  useEffect(() => {
    prewarmWorker()
  }, [])

  // Initial load: Fetch real separated jobs from backend
  useEffect(() => {
    fetchJobs()
      .then((jobs) => {
        if (!jobs || jobs.length === 0) return
        const backendSpaces: Space[] = jobs.map((j) => {
          const profileId: ProfileId = j.modelName === "htdemucs_2s" ? "2" : j.modelName === "htdemucs_6s" ? "6" : "4"
          const isReady = j.status === "SUCCEEDED"
          return {
            id: j.id,
            name: j.originalFilename.replace(/\.[^/.]+$/, ""),
            artist: j.modelName ? `Demucs (${j.modelName})` : "Veetoma Studio",
            ext: "wav",
            size: 73101612,
            sizeEstimated: false,
            duration: 414,
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
          const existingNonBackend = prev.filter((s) => !backendIds.has(s.id))
          return [...backendSpaces, ...existingNonBackend]
        })
      })
      .catch((err) => {
        console.warn("Could not load backend spaces:", err)
      })
  }, [])

  const patch = useCallback((id: string, changes: Partial<Space>) => {
    setSpaces((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)))
  }, [])

  // 1. Real Polling mechanism for spaces processing on Spring Boot backend (every 3 seconds)
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
            patch(space.id, {
              status: "ready",
              progress: 100,
              reached: 4,
              job: updatedJob,
              stemUrls: urls,
            })
          } else if (updatedJob.status === "FAILED") {
            patch(space.id, {
              status: "failed",
              errorMessage: updatedJob.errorMessage || "Demucs AI separation failed on worker",
              job: updatedJob,
            })
          } else if (updatedJob.status === "RUNNING") {
            patch(space.id, {
              progress: Math.min(92, Math.max(35, space.progress + 6)),
              job: updatedJob,
            })
          } else if (updatedJob.status === "QUEUED") {
            patch(space.id, {
              progress: Math.min(25, Math.max(12, space.progress + 2)),
              job: updatedJob,
            })
          }
        } catch (pollErr) {
          console.warn(`Polling error for space ${space.id}:`, pollErr)
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [spaces, patch])

  // 2. Fallback simulation for local/sample spaces without backend jobId
  useEffect(() => {
    const localProcessing = spaces.some((s) => s.status === "processing" && !s.jobId)
    if (!localProcessing) return

    const id = setInterval(() => {
      setSpaces((prev) =>
        prev.map((s) => {
          if (s.status !== "processing" || s.jobId) return s
          const next = s.progress + (0.7 + Math.random() * 0.8) * SPEED[s.profile]
          if (next < 100) return { ...s, progress: next }
          return { ...s, progress: 100, status: "ready", reached: 4 }
        }),
      )
    }, TICK_MS)

    return () => clearInterval(id)
  }, [spaces])

  const openNew = (input: NewSpace) => {
    const space = createSpace(input)
    setSpaces((prev) => [space, ...prev])
    setActiveId(space.id)
  }

  const showError = (message: string) => {
    setError(message)
    clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setError(null), 4500)
  }

  const handleFile = async (file: File) => {
    const ext = getExtension(file.name)
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      showError("Unsupported format. Use MP3, WAV or FLAC.")
      return
    }
    if (file.size > MAX_SIZE) {
      showError("File is larger than 200 MB.")
      return
    }
    setError(null)
    const duration = await getAudioDuration(file)
    openNew({
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
  }

  const handleTrack = async (track: Track) => {
    setError(null)
    openNew({
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
  }

  const handleDelete = (id: string) => {
    const target = spaces.find((s) => s.id === id)
    if (target?.ownsSrc && target.src) URL.revokeObjectURL(target.src)
    setSpaces((prev) => prev.filter((s) => s.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const active = spaces.find((s) => s.id === activeId)

  const selectStep = (step: StepNumber) => {
    if (!active || step > active.reached) return
    patch(active.id, { step })
  }

  const continueToProfile = () => {
    if (!active) return
    patch(active.id, { step: 2, reached: Math.max(active.reached, 2) as StepNumber })
  }

  // Real E2E: triggers upload to Spring Boot Backend
  const startSeparation = async () => {
    if (!active) return

    patch(active.id, {
      status: "processing",
      progress: 8,
      step: 3,
      reached: 3,
      errorMessage: null,
    })

    try {
      let fileToUpload = active.file
      if (!fileToUpload && active.src) {
        try {
          const res = await fetch(active.src)
          const blob = await res.blob()
          fileToUpload = new File([blob], `${active.name}.${active.ext || "wav"}`, {
            type: blob.type || "audio/wav",
          })
        } catch {
          // Cross-origin fetch might not be permitted for external demo tracks
        }
      }

      if (!fileToUpload) {
        showError("No audio file found to upload.")
        patch(active.id, {
          status: "failed",
          errorMessage: "Missing audio file for backend separation",
        })
        return
      }

      // POST to Spring Boot backend /api/jobs/upload
      const job = await uploadAudioJob(fileToUpload, active.profile)
      patch(active.id, {
        jobId: job.id,
        job,
        progress: 18,
        status: job.status === "SUCCEEDED" ? "ready" : "processing",
        stemUrls: extractStemUrls(job),
        reached: job.status === "SUCCEEDED" ? 4 : 3,
      })
    } catch (err: any) {
      console.error("Separation start failed:", err)
      patch(active.id, {
        status: "failed",
        errorMessage: err?.message || "Failed to communicate with Spring Boot backend",
      })
      showError(err?.message || "Separation request failed")
    }
  }

  const cancelSeparation = () => {
    if (!active) return
    patch(active.id, { status: "draft", progress: 0, step: 2, reached: 2 })
  }

  const openMixer = useCallback(() => {
    if (activeId) patch(activeId, { step: 4 })
  }, [activeId, patch])

  return (
    <AnimatePresence mode="wait" initial={false}>
      {active ? (
        <SpaceView
          key={active.id}
          space={active}
          onBack={() => setActiveId(null)}
          onSelectStep={selectStep}
          onContinue={continueToProfile}
          onProfile={(profile) => patch(active.id, { profile })}
          onStart={startSeparation}
          onCancel={cancelSeparation}
          onOpenMixer={openMixer}
        />
      ) : (
        <SpaceGallery
          key="gallery"
          spaces={spaces}
          tracks={tracks}
          error={error}
          onOpen={(id) => setActiveId(id)}
          onDelete={handleDelete}
          onFile={handleFile}
          onTrack={handleTrack}
        />
      )}
    </AnimatePresence>
  )
}
