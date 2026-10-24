"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, Pause, Play } from "lucide-react"
import { motion } from "motion/react"
import { Artwork } from "@/components/artwork"
import { Range } from "@/components/range"
import { formatBytes, formatTime } from "@/lib/format"
import { generatePeaks } from "@/lib/seed"
import type { Space } from "@/lib/stems"
import { PrimaryButton, StepHeading } from "./buttons"
import { Waveform } from "./waveform"

function RawPlayer({ space }: { space: Space }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(space.duration || 180)
  const peaks = useMemo(() => generatePeaks(`${space.id}-master`, 150, "phrases"), [space.id])
  const audioSrc = space.src || "/audio/demo-1.mp3"

  const toggle = () => {
    const audio = audioRef.current
    if (audio) {
      if (audio.paused) {
        audio.play().then(() => setPlaying(true)).catch((err) => {
          console.warn("Play interrupted:", err)
          setPlaying(false)
        })
      } else {
        audio.pause()
        setPlaying(false)
      }
    }
  }

  const seek = (value: number) => {
    setTime(value)
    if (audioRef.current) audioRef.current.currentTime = value
  }

  return (
    <div className="glass-panel-soft rounded-2xl p-4">
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (d && Number.isFinite(d) && d > 0) setDuration(Math.round(d))
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      />
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Raw master preview</p>
        <p className="font-mono text-xs tabular-nums text-white/70">
          {formatTime(time)} / {formatTime(duration)}
        </p>
      </div>
      <div className="h-24">
        <Waveform
          peaks={peaks}
          color="#ffe29a"
          progress={(time / duration) * 100}
          audible
          volume={100}
          onSeek={(ratio) => seek(ratio * duration)}
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <motion.button
          type="button"
          onClick={toggle}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={playing ? "Pause preview" : "Play preview"}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1f3a27] shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="ml-0.5 size-5" fill="currentColor" />}
        </motion.button>
        <div className="min-w-0 flex-1">
          <Range label="Seek preview" value={time} max={duration} step={0.1} onChange={seek} />
        </div>
      </div>
      <p className="mt-2 text-xs text-white/60">Lossless stereo master audio playback</p>
    </div>
  )
}

export function ImportStep({ space, onNext }: { space: Space; onNext: () => void }) {
  const info = [
    { label: "Format", value: space.ext === "demo" ? "DEMO" : space.ext.toUpperCase() || "AUDIO" },
    { label: "File size", value: `${space.sizeEstimated ? "~" : ""}${formatBytes(space.size)}` },
    { label: "Duration", value: space.duration ? formatTime(space.duration) : "Unknown" },
    { label: "Added", value: space.createdLabel },
  ]

  return (
    <div>
      <StepHeading
        eyebrow="Step 1 of 4"
        title="Import & preview your master track"
        description="Check the file details and listen to the raw mix before the AI splits it into stems."
      />
      <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
        <div>
          <Artwork
            seed={space.id + space.name}
            src={space.cover}
            alt={`Cover art for ${space.name}`}
            className="aspect-square w-full max-w-[220px] rounded-2xl shadow-xl shadow-black/30 ring-1 ring-white/25"
          />
        </div>
        <div className="space-y-4">
          <div>
            <p className="truncate text-lg font-semibold">{space.name}</p>
            <p className="truncate text-sm text-white/70">{space.artist}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {info.map((item) => (
              <div key={item.label} className="glass-panel-soft rounded-xl px-3 py-2.5">
                <dt className="text-[11px] uppercase tracking-wider text-white/60">{item.label}</dt>
                <dd className="mt-0.5 truncate font-mono text-sm tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
          <RawPlayer space={space} />
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={onNext}>
          Continue to profile
          <ArrowRight className="size-4" />
        </PrimaryButton>
      </div>
    </div>
  )
}
