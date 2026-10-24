"use client"

import { memo, useRef, useState } from "react"
import { Scissors, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToolMode = "pointer" | "split" | "range" | "delete"

export type TrimRange = {
  startRatio: number
  endRatio: number
}

export type CutSegment = {
  id: string
  startRatio: number
  endRatio: number
}

const Bars = memo(function Bars({ peaks, color, scale }: { peaks: number[]; color: string; scale: number }) {
  return (
    <div className="flex h-full items-center gap-px">
      {peaks.map((peak, i) => (
        <span
          key={i}
          className="min-w-px flex-1 rounded-full transition-[height] duration-75"
          style={{ height: `${Math.max(4, peak * 92 * scale)}%`, backgroundColor: color }}
        />
      ))}
    </div>
  )
})

type WaveformProps = {
  peaks: number[]
  color: string
  progress: number
  audible: boolean
  volume: number
  onSeek: (ratio: number) => void
  toolMode?: ToolMode
  isActive?: boolean
  selection?: { startRatio: number; endRatio: number } | null
  trim?: TrimRange
  cuts?: CutSegment[]
  splits?: number[]
  onTrackClick?: () => void
  onSelectRange?: (startRatio: number, endRatio: number) => void
  onSplitClick?: (ratio: number) => void
  onDeleteSegment?: (id: string) => void
}

export function Waveform({
  peaks,
  color,
  progress,
  audible,
  volume,
  onSeek,
  toolMode = "pointer",
  isActive = false,
  selection = null,
  trim = { startRatio: 0, endRatio: 1 },
  cuts = [],
  splits = [],
  onTrackClick,
  onSelectRange,
  onSplitClick,
  onDeleteSegment,
}: WaveformProps) {
  const scale = 0.35 + 0.65 * (volume / 100)
  const isDraggingRange = useRef(false)
  const rangeStartRatio = useRef<number | null>(null)
  const [hoverRatio, setHoverRatio] = useState<number | null>(null)

  const getRatioFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onTrackClick?.()
    const ratio = getRatioFromEvent(e)
    e.currentTarget.setPointerCapture(e.pointerId)

    if (toolMode === "split") {
      onSplitClick?.(ratio)
      return
    }

    if (toolMode === "range") {
      isDraggingRange.current = true
      rangeStartRatio.current = ratio
      onSelectRange?.(ratio, ratio)
      return
    }

    // Default pointer: seek
    onSeek(ratio)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ratio = getRatioFromEvent(e)
    setHoverRatio(ratio)

    if (toolMode === "range" && isDraggingRange.current && rangeStartRatio.current !== null) {
      const start = Math.min(rangeStartRatio.current, ratio)
      const end = Math.max(rangeStartRatio.current, ratio)
      onSelectRange?.(start, end)
      return
    }

    if (toolMode === "pointer" && e.buttons === 1) {
      onSeek(ratio)
    }
  }

  const handlePointerUp = () => {
    if (isDraggingRange.current) {
      isDraggingRange.current = false
      rangeStartRatio.current = null
    }
  }

  // Cursor style based on active tool
  const getCursor = () => {
    switch (toolMode) {
      case "split":
        return "cursor-crosshair"
      case "range":
        return "cursor-col-resize"
      case "delete":
        return "cursor-pointer"
      default:
        return "cursor-pointer"
    }
  }

  return (
    <div
      className={cn(
        "group/wave relative h-full select-none touch-none overflow-hidden rounded-lg bg-black/35 px-1.5 py-2 ring-1 transition-all",
        isActive ? "ring-[#ffe29a]/60 shadow-[0_0_15px_rgba(255,226,154,0.2)]" : "ring-white/10",
        getCursor(),
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        setHoverRatio(null)
        if (isDraggingRange.current) {
          isDraggingRange.current = false
          rangeStartRatio.current = null
        }
      }}
    >
      {/* Background Dimmed Bars */}
      <div className="absolute inset-x-1.5 inset-y-2 transition-opacity" style={{ opacity: audible ? 0.28 : 0.08 }}>
        <Bars peaks={peaks} color={color} scale={scale} />
      </div>

      {/* Played Foreground Bars (clipped to current progress) */}
      <div
        className="absolute inset-x-1.5 inset-y-2 transition-opacity"
        style={{
          opacity: audible ? 1 : 0.25,
          clipPath: `inset(0 ${Math.max(0, 100 - progress)}% 0 0)`,
        }}
      >
        <Bars peaks={peaks} color={color} scale={scale} />
      </div>

      {/* Out-of-bounds Trim Overlays */}
      {trim.startRatio > 0 && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 bg-black/60 backdrop-blur-[1px] border-r border-white/20"
          style={{ width: `${trim.startRatio * 100}%` }}
        >
          <div className="absolute right-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[8px] font-mono uppercase text-white/50">
            Trim
          </div>
        </div>
      )}
      {trim.endRatio < 1 && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 bg-black/60 backdrop-blur-[1px] border-l border-white/20"
          style={{ left: `${trim.endRatio * 100}%`, width: `${(1 - trim.endRatio) * 100}%` }}
        >
          <div className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[8px] font-mono uppercase text-white/50">
            Trim
          </div>
        </div>
      )}

      {/* Cut / Muted Segments */}
      {cuts.map((cut) => {
        const left = Math.min(cut.startRatio, cut.endRatio) * 100
        const width = Math.abs(cut.endRatio - cut.startRatio) * 100
        return (
          <div
            key={cut.id}
            onClick={(e) => {
              if (toolMode === "delete") {
                e.stopPropagation()
                onDeleteSegment?.(cut.id)
              }
            }}
            title="Cut Segment (Muted)"
            className={cn(
              "absolute inset-y-0 z-10 flex items-center justify-center border-x border-red-500/50 bg-red-950/40 text-red-200/80 backdrop-blur-[0.5px] transition hover:bg-red-900/50",
              toolMode === "delete" && "cursor-pointer ring-1 ring-red-400",
            )}
            style={{ left: `${left}%`, width: `${width}%` }}
          >
            <div className="flex items-center gap-1 px-1 py-0.5 rounded bg-black/60 text-[9px] font-mono text-red-400">
              <Trash2 className="size-2.5" />
              <span>CUT</span>
            </div>
          </div>
        )
      })}

      {/* Split Points */}
      {splits.map((sRatio, idx) => (
        <div
          key={`split-${idx}`}
          className="pointer-events-none absolute inset-y-0 z-15 w-px border-l border-dashed border-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.7)]"
          style={{ left: `${sRatio * 100}%` }}
        >
          <div className="absolute -left-1.5 top-0 size-3 -translate-y-1/2 rotate-45 border-b border-r border-amber-300 bg-amber-400/90" />
        </div>
      ))}

      {/* Range Selection Highlight */}
      {selection && (
        <div
          className="pointer-events-none absolute inset-y-0 z-12 border-x-2 border-[#ffe29a] bg-[#ffe29a]/20 shadow-[0_0_16px_rgba(255,226,154,0.3)] backdrop-blur-[0.5px]"
          style={{
            left: `${Math.min(selection.startRatio, selection.endRatio) * 100}%`,
            width: `${Math.abs(selection.endRatio - selection.startRatio) * 100}%`,
          }}
        >
          <div className="absolute left-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-[8px] font-mono text-[#ffe29a]">
            {Math.round(Math.abs(selection.endRatio - selection.startRatio) * 100)}%
          </div>
        </div>
      )}

      {/* Tool Hover Guide */}
      {toolMode === "split" && hoverRatio !== null && (
        <div
          className="pointer-events-none absolute inset-y-0 z-20 w-px bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]"
          style={{ left: `${hoverRatio * 100}%` }}
        >
          <div className="absolute -left-2 top-1 flex items-center justify-center rounded bg-cyan-500 p-0.5 text-black">
            <Scissors className="size-2.5" />
          </div>
        </div>
      )}

      {/* Main Playhead Cursor */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 z-25 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
        style={{ left: `${progress}%` }}
      >
        <div className="absolute -left-1 -top-0.5 size-2.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,1)]" />
      </div>
    </div>
  )
}
