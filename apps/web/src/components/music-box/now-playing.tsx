"use client"

import { Music2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react"
import { Artwork } from "@/components/artwork"
import { Range } from "@/components/range"
import { formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { RepeatMode, Track } from "./types"

type NowPlayingProps = {
  track?: Track
  playing: boolean
  time: number
  volume: number
  muted: boolean
  repeat: RepeatMode
  shuffle: boolean
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (time: number) => void
  onVolume: (volume: number) => void
  onMute: () => void
  onRepeat: () => void
  onShuffle: () => void
}

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-10 items-center justify-center rounded-full text-white/70 transition-all duration-75 hover:bg-white/15 hover:text-white hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-ring",
        active && "bg-white/20 text-white",
      )}
    >
      {children}
    </button>
  )
}

export function NowPlaying(props: NowPlayingProps) {
  const { track, playing, time, volume, muted, repeat, shuffle } = props
  const duration = track?.duration ?? 0
  const disabled = !track

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto w-full max-w-[280px] rounded-3xl bg-black/30 p-3 ring-1 ring-white/20 backdrop-blur-sm">
        <div
          aria-hidden="true"
          className={cn(
            "absolute -inset-4 -z-10 rounded-[2rem] bg-[#ffe29a]/30 blur-2xl transition-opacity duration-150",
            playing ? "opacity-70" : "opacity-20",
          )}
        />
        <div className="aspect-square w-full overflow-hidden rounded-2xl shadow-xl shadow-black/40">
          {track ? (
            <Artwork
              key={track.id}
              seed={track.id + track.title}
              src={track.cover}
              alt={`Cover art for ${track.title}`}
              className="size-full transition-opacity duration-75"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-white/25 bg-white/5 p-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white/60">
                <Music2 className="size-6" />
              </span>
              <span className="text-sm font-medium text-white/80">No track selected</span>
              <span className="text-xs text-white/50">Pick a track from playlist</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-md">
        <div className="min-w-0 text-center">
          <div key={track?.id ?? "none"} className="transition-opacity duration-75">
            <h3 className="truncate text-lg font-semibold text-balance">
              {track?.title ?? "No track selected"}
            </h3>
            <p className="truncate text-sm text-white/70">
              {track?.artist ?? "Select a track to start playback"}
            </p>
          </div>
          {track?.source === "demo" && (
            <p className="mt-2 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] text-white/80">
              Demo track &middot; simulated playback
            </p>
          )}
        </div>

        <div className="mt-3">
          <Range
            label="Seek"
            value={Math.min(time, duration)}
            max={duration || 1}
            step={0.1}
            onChange={props.onSeek}
            className={disabled ? "pointer-events-none opacity-40" : undefined}
          />
          <div className="flex justify-between font-mono text-xs tabular-nums text-white/70">
            <span>{formatTime(time)}</span>
            <span>-{formatTime(Math.max(0, duration - time))}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <IconButton label="Shuffle" active={shuffle} onClick={props.onShuffle}>
            <Shuffle className="size-4" />
          </IconButton>
          <IconButton label="Previous track" onClick={props.onPrev}>
            <SkipBack className="size-5" />
          </IconButton>
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            disabled={disabled}
            onClick={props.onToggle}
            className="glow-gold flex size-14 items-center justify-center rounded-full bg-white text-[#1f3a27] transition-transform duration-75 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {playing ? <Pause className="size-6" fill="currentColor" /> : <Play className="ml-0.5 size-6" fill="currentColor" />}
          </button>
          <IconButton label="Next track" onClick={props.onNext}>
            <SkipForward className="size-5" />
          </IconButton>
          <IconButton label={`Repeat: ${repeat}`} active={repeat !== "off"} onClick={props.onRepeat}>
            {repeat === "one" ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
          </IconButton>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
            onClick={props.onMute}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/70 hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
          >
            {muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <Range label="Volume" value={muted ? 0 : Math.round(volume * 100)} onChange={(v) => props.onVolume(v / 100)} />
        </div>
      </div>
    </div>
  )
}
