"use client"

import { useState, useEffect } from "react"
import { AudioLines, Disc3, SlidersHorizontal } from "lucide-react"
import { MotionConfig, motion } from "motion/react"
import MusicBox from "@/components/music-box/music-box"
import type { Track } from "@/components/music-box/types"
import StemStudio from "@/components/stem-studio/stem-studio"
import { GlassFilterDefs } from "@/components/glass"
import { DEMO_TRACKS } from "@/lib/demo-tracks"
import { fetchMusicBoxTracks } from "@/lib/api"
import { cn } from "@/lib/utils"

type TabId = "music" | "studio"

const TABS: { id: TabId; label: string; icon: typeof Disc3 }[] = [
  { id: "music", label: "Music Box", icon: Disc3 },
  { id: "studio", label: "AI Stem Studio", icon: SlidersHorizontal },
]

const POLLEN = [
  { left: "8%", size: 5, duration: 19, delay: 0 },
  { left: "18%", size: 3, duration: 24, delay: 6 },
  { left: "27%", size: 4, duration: 21, delay: 12 },
  { left: "36%", size: 6, duration: 27, delay: 3 },
  { left: "47%", size: 3, duration: 22, delay: 9 },
  { left: "56%", size: 5, duration: 26, delay: 15 },
  { left: "64%", size: 4, duration: 20, delay: 5 },
  { left: "73%", size: 3, duration: 25, delay: 11 },
  { left: "82%", size: 6, duration: 23, delay: 2 },
  { left: "91%", size: 4, duration: 28, delay: 8 },
]

function Backdrop({ isStudio }: { isStudio: boolean }) {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden bg-[#1b3322]">
      {/* Background illustration */}
      <motion.div
        className="absolute -inset-[5%] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/bg-img.jpg)" }}
        animate={{ scale: [1, 1.06, 1], x: ["0%", "-1.5%", "0%"] }}
        transition={{ duration: 45, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sun/Pollen glow: dimmed down in Studio mode to avoid harsh screen glare */}
      <motion.div
        className="absolute -top-1/4 left-1/2 h-[140%] w-[60%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,236,170,0.4),transparent_65%)] mix-blend-screen"
        animate={
          isStudio
            ? { opacity: 0.08, scaleX: 1 }
            : { opacity: [0.5, 0.95, 0.5], scaleX: [1, 1.12, 1] }
        }
        transition={{ duration: isStudio ? 0.8 : 9, repeat: isStudio ? 0 : Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-black/50" />

      {/* Floating particles - subtle in studio mode */}
      {POLLEN.map((p, i) => (
        <motion.span
          key={i}
          className="absolute bottom-0 rounded-full bg-[#fff2c2] shadow-[0_0_10px_3px_rgba(255,236,170,0.7)]"
          style={{ left: p.left, width: p.size, height: p.size }}
          initial={{ y: 40, opacity: 0 }}
          animate={{
            y: "-105vh",
            x: [0, 28, -18, 12],
            opacity: isStudio ? [0, 0.15, 0.15, 0] : [0, 0.9, 0.9, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}

      {/* Dedicated Deep Dark Studio Console Filter for Stem Studio mode */}
      <motion.div
        animate={{ opacity: isStudio ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050b07]/85 via-[#08120a]/80 to-[#030604]/92 backdrop-blur-[2px]"
      />
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="glow-gold flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-[#1f3a27]">
        <AudioLines className="size-5" strokeWidth={2.5} />
      </span>
      <div className="leading-tight">
        <p className="text-base font-semibold tracking-tight">Veetoma</p>
        <p className="hidden text-[11px] uppercase tracking-[0.2em] text-white/70 sm:block">Music & Stem Studio</p>
      </div>
    </div>
  )
}

function Panel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={
        active
          ? { opacity: 1, y: 0, scale: 1, display: "block" }
          : { opacity: 0, y: 18, scale: 0.98, transitionEnd: { display: "none" } }
      }
      transition={{ type: "spring", stiffness: 140, damping: 20 }}
      aria-hidden={!active}
    >
      {children}
    </motion.div>
  )
}

export default function AppShell() {
  const [tab, setTab] = useState<TabId>("music")
  const [tracks, setTracks] = useState<Track[]>(DEMO_TRACKS)

  useEffect(() => {
    // Load dedicated Music Box playlist from database and music directory
    fetchMusicBoxTracks()
      .then((mbTracks) => {
        if (mbTracks && mbTracks.length > 0) {
          const loadedTracks: Track[] = mbTracks.map((t) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            album: t.album,
            duration: t.durationSeconds || 180,
            source: "musicbox",
            src: t.audioUrl,
            cover: t.coverUrl,
            genre: t.genre,
            size: t.fileSizeBytes,
          }))
          setTracks(loadedTracks)
        }
      })
      .catch((err) => {
        console.warn("Could not fetch music box tracks:", err)
      })
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <GlassFilterDefs />
      <Backdrop isStudio={tab === "studio"} />
      <div className="relative flex min-h-dvh flex-col">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-5 md:px-6">
          <h1 className="sr-only">Veetoma Music Box and AI Stem Studio</h1>
          <Brand />
          <nav aria-label="Primary" className="glass-panel flex gap-1 rounded-full p-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring sm:px-4",
                    active ? "text-[#1f3a27]" : "text-white/80 hover:text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      className="glow-gold absolute inset-0 rounded-full bg-white/90"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="relative size-4" />
                  <span className="relative hidden sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">{label}</span>
                </button>
              )
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6 md:px-6">
          <Panel active={tab === "music"}>
            <MusicBox tracks={tracks} setTracks={setTracks} />
          </Panel>
          <Panel active={tab === "studio"}>
            <StemStudio />
          </Panel>
        </main>
      </div>
    </MotionConfig>
  )
}

