"use client"

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { Disc3 } from "lucide-react"
import { GlassCard } from "@/components/glass"
import { getAudioDuration, getExtension, stripExtension } from "@/lib/format"
import { Library } from "./library"
import { NowPlaying } from "./now-playing"
import type { RepeatMode, Track } from "./types"

const AUDIO_EXTENSIONS = ["mp3", "wav", "flac", "m4a", "ogg", "aac"]

function parseName(fileName: string) {
  const base = stripExtension(fileName)
  const parts = base.split(" - ")
  if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() }
  return { artist: "Unknown artist", title: base }
}

type MusicBoxProps = {
  tracks: Track[]
  setTracks: Dispatch<SetStateAction<Track[]>>
  initialTrackId?: string
  onTrackSelect?: (id: string) => void
}

export default function MusicBox({ tracks, setTracks, initialTrackId, onTrackSelect }: MusicBoxProps) {
  const [currentId, setCurrentId] = useState<string | undefined>(initialTrackId)
  const [playing, setPlaying] = useState(Boolean(initialTrackId))
  const [time, setTime] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [repeat, setRepeat] = useState<RepeatMode>("off")
  const [shuffle, setShuffle] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const tracksRef = useRef(tracks)
  const lastInitialRef = useRef<string | undefined>(initialTrackId)

  const current = tracks.find((t) => t.id === currentId)
  const index = current ? tracks.findIndex((t) => t.id === current.id) : -1

  useEffect(() => {
    tracksRef.current = tracks

    // Only sync if initialTrackId prop actually changed from outside
    if (initialTrackId !== lastInitialRef.current) {
      lastInitialRef.current = initialTrackId
      if (initialTrackId) {
        if (tracks.some((t) => t.id === initialTrackId)) {
          setCurrentId(initialTrackId)
          setPlaying(true)
        }
      } else {
        setCurrentId(undefined)
        setPlaying(false)
        setTime(0)
      }
    } else if (initialTrackId && !currentId && tracks.some((t) => t.id === initialTrackId)) {
      // Hydrate when tracks finish loading from backend asynchronously
      setCurrentId(initialTrackId)
      setPlaying(true)
    }
  }, [tracks, initialTrackId, currentId])

  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname
      const match = pathname.match(/^\/box\/(.+)$/)
      if (match && match[1]) {
        const targetId = match[1]
        setCurrentId(targetId)
        setPlaying(true)
      } else if (pathname === "/box") {
        setCurrentId(undefined)
        setPlaying(false)
        setTime(0)
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    return () => {
      tracksRef.current.forEach((t) => t.src && URL.revokeObjectURL(t.src))
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = muted ? 0 : volume
  }, [volume, muted])

  const activeSrc = current?.src || ""

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!currentId || !activeSrc) {
      audio.pause()
      return
    }
    if (playing) {
      const p = audio.play()
      if (p !== undefined) {
        p.catch((err) => {
          if (err.name !== "AbortError") {
            console.warn("Audio play error:", err)
          }
        })
      }
    } else {
      audio.pause()
    }
  }, [playing, currentId, activeSrc])

  useEffect(() => {
    if (!playing || !current) return
    // Safety timer in case audio element is buffering or simulated
    const id = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        setTime(audioRef.current.currentTime)
      }
    }, 250)
    return () => clearInterval(id)
  }, [playing, current])

  const select = (id: string, autoplay = true) => {
    if (id === currentId) {
      setPlaying((p) => !p)
      return
    }
    setCurrentId(id)
    setTime(0)
    setPlaying(autoplay)
    onTrackSelect?.(id)
  }

  const restart = () => {
    const audio = audioRef.current
    setTime(0)
    if (audio && current?.src) {
      audio.currentTime = 0
      audio.play().catch(() => setPlaying(false))
    }
    setPlaying(true)
  }

  const pickNext = () => {
    if (!tracks.length) return
    if (!current) return tracks[0]?.id
    if (shuffle && tracks.length > 1) {
      let r = index
      while (r === index) r = Math.floor(Math.random() * tracks.length)
      return tracks[r].id
    }
    return tracks[(index + 1) % tracks.length].id
  }

  const handleNext = () => {
    const nextId = pickNext()
    if (!nextId) return
    if (nextId === currentId) restart()
    else select(nextId)
  }

  const handlePrev = () => {
    if (!tracks.length) return
    if (!current) {
      if (tracks[0]) select(tracks[0].id)
      return
    }
    if (time > 3) return handleSeek(0)
    const prev = tracks[(index - 1 + tracks.length) % tracks.length]
    if (prev.id === currentId) restart()
    else select(prev.id)
  }

  function handleEnded() {
    if (repeat === "one") return restart()
    const isLast = index === tracks.length - 1
    if (isLast && repeat === "off" && !shuffle) {
      setPlaying(false)
      setTime(0)
      if (audioRef.current) audioRef.current.currentTime = 0
      return
    }
    handleNext()
  }

  function handleSeek(value: number) {
    setTime(value)
    if (audioRef.current && current?.src) audioRef.current.currentTime = value
  }

  const handleFiles = (files: File[]) => {
    const accepted = files.filter((f) => f.type.startsWith("audio/") || AUDIO_EXTENSIONS.includes(getExtension(f.name)))
    if (!accepted.length) return

    const added: Track[] = accepted.map((file) => {
      const { artist, title } = parseName(file.name)
      return {
        id: `upload-${Math.random().toString(36).slice(2, 10)}`,
        title,
        artist,
        duration: 0,
        source: "upload",
        src: URL.createObjectURL(file),
        size: file.size,
        ext: getExtension(file.name),
      }
    })

    setTracks((prev) => [...prev, ...added])
    if (!current) select(added[0].id, false)

    accepted.forEach((file, i) => {
      getAudioDuration(file).then((duration) => {
        setTracks((prev) => prev.map((t) => (t.id === added[i].id ? { ...t, duration } : t)))
      })
    })
  }

  const handleDelete = (id: string) => {
    const target = tracks.find((t) => t.id === id)
    if (target?.src) URL.revokeObjectURL(target.src)
    const remaining = tracks.filter((t) => t.id !== id)
    setTracks(remaining)
    if (id === currentId) {
      setPlaying(false)
      setTime(0)
      const nextTrack = remaining[Math.min(index, remaining.length - 1)]
      if (nextTrack) {
        select(nextTrack.id, false)
      } else {
        setCurrentId(undefined)
      }
    }
  }

  const handleRepeat = () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"))

  return (
    <GlassCard className="mx-auto w-full max-w-5xl" contentClassName="p-5 md:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
          <Disc3 className={playing ? "size-5 animate-spin [animation-duration:3s]" : "size-5"} />
        </span>
        <div className="leading-tight">
          <h2 className="text-lg font-semibold tracking-tight">Music Box</h2>
          <p className="text-xs text-white/70">Your personal library, bathed in light</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
      <audio
        ref={audioRef}
        src={activeSrc || undefined}
        preload="auto"
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const dur = Math.round(e.currentTarget.duration)
          if (!current || !Number.isFinite(dur)) return
          if (!current.duration || Math.abs(current.duration - dur) > 1) {
            setTracks((prev) => prev.map((t) => (t.id === current.id ? { ...t, duration: dur } : t)))
          }
        }}
        onEnded={handleEnded}
      />

      <div>
        <NowPlaying
          track={current}
          playing={playing}
          time={time}
          volume={volume}
          muted={muted}
          repeat={repeat}
          shuffle={shuffle}
          onToggle={() => current && setPlaying((p) => !p)}
          onPrev={handlePrev}
          onNext={handleNext}
          onSeek={handleSeek}
          onVolume={(v) => {
            setVolume(v)
            setMuted(false)
          }}
          onMute={() => setMuted((m) => !m)}
          onRepeat={handleRepeat}
          onShuffle={() => setShuffle((s) => !s)}
        />
      </div>

      <Library
        tracks={tracks}
        currentId={currentId}
        playing={playing}
        onSelect={select}
        onDelete={handleDelete}
        onFiles={handleFiles}
      />
      </div>
    </GlassCard>
  )
}
