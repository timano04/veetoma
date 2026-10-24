"use client"

import { useState } from "react"
import { AlertCircle, FolderOpen, Music2, Plus, Trash2, UploadCloud } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Artwork } from "@/components/artwork"
import { GlassCard } from "@/components/glass"
import { formatBytes, formatTime } from "@/lib/format"
import { PROFILES, type Space } from "@/lib/stems"
import { cn } from "@/lib/utils"
import { SpaceStatusBadge } from "./space-status"

type SpaceGalleryProps = {
  spaces: Space[]
  error: string | null
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onFile: (file: File) => void
  tracks?: any
  onTrack?: any
}

function NewSpacePanel({ error, onFile }: Pick<SpaceGalleryProps, "error" | "onFile">) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="w-full">
      <label
        className={cn(
          "glass-panel-soft group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/30 px-6 py-12 text-center transition-all duration-300 hover:border-[#ffe29a]/70 hover:bg-white/10 focus-within:outline-2 focus-within:outline-ring",
          dragging && "border-[#ffe29a] bg-white/20 shadow-[0_0_40px_rgba(255,226,154,0.25)]",
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) onFile(file)
        }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          className="glow-gold relative flex size-18 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-[#ffe29a] text-[#1f3a27] shadow-xl shadow-black/20"
        >
          <UploadCloud className="size-9 stroke-[2.2]" />
        </motion.div>

        <div className="space-y-1.5">
          <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-[#ffe29a] transition-colors">
            Drop your master track or click to browse
          </h3>
          <p className="max-w-md text-sm text-pretty text-white/75">
            Create a dedicated studio space for neural stem separation, real-time multi-track mixing, and timeline clip editing.
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white/80 ring-1 ring-white/15">
            WAV &bull; MP3 &bull; FLAC &bull; AIFF
          </span>
          <span className="rounded-full bg-[#ffe29a]/15 px-3 py-1 font-mono text-xs text-[#ffe29a] ring-1 ring-[#ffe29a]/30">
            Up to 200 MB
          </span>
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 font-mono text-xs text-emerald-300 ring-1 ring-emerald-400/30">
            2, 4 or 6 Stems
          </span>
        </div>

        <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-white/25 transition-all group-hover:bg-white group-hover:text-[#1f3a27]">
          Browse audio files
        </div>

        <input
          type="file"
          accept=".mp3,.wav,.flac,.aiff,.ogg,audio/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
            e.target.value = ""
          }}
        />

        <AnimatePresence>
          {error && (
            <motion.span
              role="alert"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-400/25 px-4 py-1.5 text-xs font-medium text-red-50 ring-1 ring-red-200/40"
            >
              <AlertCircle className="size-4" />
              {error}
            </motion.span>
          )}
        </AnimatePresence>
      </label>
    </div>
  )
}

function SpaceCard({ space, index, onOpen, onDelete }: { space: Space; index: number; onOpen: () => void; onDelete: () => void }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 180, damping: 20, delay: Math.min(index, 6) * 0.06 }}
      whileHover={{ y: -6 }}
      className="group relative"
    >
      <button
        type="button"
        onClick={onOpen}
        className="glass-panel-soft block w-full overflow-hidden rounded-3xl p-3 text-left transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div className="relative">
          <Artwork
            seed={space.id + space.name}
            src={space.cover}
            className="aspect-[16/10] w-full rounded-2xl"
          />
          <div className="absolute inset-0 rounded-2xl bg-linear-to-t from-black/60 via-transparent to-transparent" />
          <SpaceStatusBadge space={space} className="absolute bottom-2 left-2 backdrop-blur-md" />
          {space.status === "processing" && (
            <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-2xl bg-white/20">
              <div className="h-full bg-[#ffe29a] transition-[width] duration-300" style={{ width: `${space.progress}%` }} />
            </div>
          )}
        </div>
        <div className="px-1 pb-1 pt-3">
          <p className="truncate font-semibold">{space.name}</p>
          <p className="truncate text-xs text-white/70">{space.artist}</p>
          <p className="mt-2 font-mono text-xs tabular-nums text-white/60">
            {space.duration ? formatTime(space.duration) : "--:--"} &middot; {space.sizeEstimated ? "~" : ""}
            {formatBytes(space.size)} &middot; {PROFILES[space.profile].count} stems
          </p>
        </div>
      </button>
      <button
        type="button"
        aria-label={`Delete space ${space.name}`}
        onClick={onDelete}
        className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-full bg-black/40 text-white/80 opacity-0 backdrop-blur-md transition hover:bg-red-500/70 hover:text-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring group-hover:opacity-100"
      >
        <Trash2 className="size-4" />
      </button>
    </motion.li>
  )
}

export function SpaceGallery({ spaces, tracks, error, onOpen, onDelete, onFile, onTrack }: SpaceGalleryProps) {
  return (
    <GlassCard
      className="w-full"
      contentClassName="p-5 md:p-7"
      initial={{ opacity: 0, x: -60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60, transition: { duration: 0.2 } }}
    >
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight">AI Stem Studio</h2>
        <p className="mt-1 max-w-xl text-sm text-white/75">
          Every song gets its own space with its own profile, progress and mixer. Create one to start.
        </p>
      </div>

      <NewSpacePanel error={error} onFile={onFile} />

      <div className="mb-3 mt-8 flex items-center gap-2">
        <FolderOpen className="size-4 text-[#ffe29a]" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">Your spaces</h3>
        <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-xs tabular-nums">{spaces.length}</span>
      </div>

      {spaces.length === 0 ? (
        <p className="glass-panel-soft rounded-2xl px-4 py-8 text-center text-sm text-white/70">
          No spaces yet. Drop or upload an audio file above to start isolating stems.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial>
            {spaces.map((space, i) => (
              <SpaceCard
                key={space.id}
                space={space}
                index={i}
                onOpen={() => onOpen(space.id)}
                onDelete={() => onDelete(space.id)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </GlassCard>
  )
}
