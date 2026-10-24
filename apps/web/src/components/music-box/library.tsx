"use client"

import { useState } from "react"
import { Music2 } from "lucide-react"
import { Artwork, Equalizer } from "@/components/artwork"
import { formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Track } from "./types"

type LibraryProps = {
  tracks: Track[]
  currentId?: string
  playing: boolean
  onSelect: (id: string) => void
  onDelete?: (id: string) => void
  onFiles?: (files: File[]) => void
}

export function Library({ tracks, currentId, playing, onSelect, onDelete, onFiles }: LibraryProps) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="relative min-h-[360px]">
      <div
        className={cn(
          "flex flex-col rounded-3xl bg-black/20 ring-1 ring-white/15 backdrop-blur-sm transition-colors md:absolute md:inset-0",
          dragging && "bg-white/15 ring-2 ring-white/60",
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          onFiles?.(Array.from(e.dataTransfer.files))
        }}
      >
        <div className="flex items-center justify-between gap-3 p-4 pb-2">
          <div>
            <h3 className="text-base font-semibold">Playlist</h3>
            <p className="text-xs text-white/70">
              {tracks.length} {tracks.length === 1 ? "master track" : "master tracks"}
            </p>
          </div>
        </div>

        {tracks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-white/15">
              <Music2 className="size-6" />
            </div>
            <p className="font-medium">No tracks available</p>
            <p className="max-w-xs text-sm text-white/70">
              Your studio master library is currently empty.
            </p>
          </div>
        ) : (
          <ul className="glass-scroll max-h-[440px] min-h-0 flex-1 space-y-1 overflow-y-auto p-2 md:max-h-none">
            {tracks.map((track, index) => {
              const isCurrent = track.id === currentId
              return (
                <li
                  key={track.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-2xl pr-2 transition-colors duration-75 hover:bg-white/10",
                    isCurrent && "bg-white/20 ring-1 ring-white/30",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(track.id)}
                    aria-current={isCurrent ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2.5 text-left transition-transform duration-75 group-hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="flex w-5 shrink-0 justify-center font-mono text-xs tabular-nums text-white/70">
                      {isCurrent ? <Equalizer playing={playing} /> : index + 1}
                    </span>
                    <Artwork
                      seed={track.id + track.title}
                      src={track.cover}
                      className="size-11 shrink-0 rounded-xl"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{track.title}</span>
                      <span className="block truncate text-xs text-white/70">{track.artist}</span>
                    </span>
                    <span className="hidden rounded-full border border-white/25 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70 sm:inline">
                      {track.source === "musicbox" ? "Master" : track.source === "demo" ? "Demo" : "Local"}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-white/70">
                      {track.duration ? formatTime(track.duration) : "--:--"}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
