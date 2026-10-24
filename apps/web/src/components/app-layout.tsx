"use client"

import React, { useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AudioLines, Disc3, SlidersHorizontal } from "lucide-react"
import { motion, MotionConfig } from "motion/react"
import { Backdrop } from "./backdrop"
import { cn } from "@/lib/utils"
import { useStudio } from "@/context/studio-context"

function Brand() {
  return (
    <Link href="/box" className="group flex items-center gap-3 transition-opacity hover:opacity-90">
      <span className="glow-gold flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-[#1f3a27] transition-transform duration-300 group-hover:scale-105">
        <AudioLines className="size-5" strokeWidth={2.5} />
      </span>
      <div className="leading-tight">
        <p className="text-base font-semibold tracking-tight text-white">Veetoma</p>
        <p className="hidden text-[11px] uppercase tracking-[0.2em] text-white/70 sm:block">
          Music & Stem Studio
        </p>
      </div>
    </Link>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { activeSpace } = useStudio()

  const isStudio = pathname.startsWith("/stem")
  const activeTab = isStudio ? "studio" : "music"

  // If a space is already active and ready in Studio, link to its current step directly
  const stemTargetUrl = useMemo(() => {
    if (pathname.startsWith("/stem/")) return pathname
    if (activeSpace) {
      return `/stem/${activeSpace.id}/step${activeSpace.step || 4}`
    }
    return "/stem"
  }, [pathname, activeSpace])

  const tabs = [
    { id: "music", label: "Music Box", icon: Disc3, href: "/box" },
    { id: "studio", label: "AI Stem Studio", icon: SlidersHorizontal, href: stemTargetUrl },
  ]

  return (
    <MotionConfig reducedMotion="user">
      <Backdrop isStudio={isStudio} />
      <div className="relative flex min-h-dvh flex-col" style={{ contain: "layout" }}>
        {/* Navigation Header */}
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-5 md:px-6">
          <Brand />
          <nav aria-label="Primary" className="glass-panel flex gap-1 rounded-full p-1">
            {tabs.map(({ id, label, icon: Icon, href }) => {
              const active = activeTab === id
              return (
                <Link
                  key={id}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring sm:px-4",
                    active ? "text-[#1f3a27]" : "text-white/80 hover:text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      className="glow-gold absolute inset-0 rounded-full bg-white/95"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <Icon className="relative size-4" />
                  <span className="relative hidden sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">{label}</span>
                </Link>
              )
            })}
          </nav>
        </header>

        {/* Dynamic Route Content */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6 md:px-6">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </MotionConfig>
  )
}
