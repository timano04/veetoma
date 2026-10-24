"use client"

import React, { memo } from "react"
import { cn } from "@/lib/utils"

const PARTICLES = [
  { left: "8%", size: 5, duration: "19s", delay: "0s" },
  { left: "18%", size: 3, duration: "24s", delay: "6s" },
  { left: "27%", size: 4, duration: "21s", delay: "12s" },
  { left: "36%", size: 6, duration: "27s", delay: "3s" },
  { left: "47%", size: 3, duration: "22s", delay: "9s" },
  { left: "56%", size: 5, duration: "26s", delay: "15s" },
  { left: "64%", size: 4, duration: "20s", delay: "5s" },
  { left: "73%", size: 3, duration: "25s", delay: "11s" },
  { left: "82%", size: 6, duration: "23s", delay: "2s" },
  { left: "91%", size: 4, duration: "28s", delay: "8s" },
]

export const Backdrop = memo(function Backdrop({ isStudio }: { isStudio: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-[#1b3322]"
      style={{ contain: "strict" }}
    >
      {/* 1. Hardware-accelerated background image pan */}
      <div
        className="absolute -inset-[5%] bg-cover bg-center bg-no-repeat bg-animated-pan"
        style={{
          backgroundImage: "url(/bg-img.jpg)",
          transform: "translateZ(0)",
          willChange: "transform",
        }}
      />

      {/* 2. Radial sun/warm glow (dimmed in studio mode via CSS transition) */}
      <div
        className={cn(
          "absolute -top-1/4 left-1/2 h-[140%] w-[60%] -translate-x-1/2 mix-blend-screen transition-opacity duration-700 ease-out",
          isStudio ? "opacity-10" : "opacity-80",
        )}
        style={{
          background: "radial-gradient(ellipse at top, rgba(255, 236, 170, 0.45), transparent 65%)",
          transform: "translate3d(-50%, 0, 0)",
          willChange: "opacity",
        }}
      />

      {/* 3. Subtle vignette gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50" />

      {/* 4. GPU-accelerated floating particles using CSS Keyframes */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden transition-opacity duration-700",
          isStudio ? "opacity-25" : "opacity-90",
        )}
      >
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="particle-pollen absolute bottom-0 rounded-full bg-[#fff2c2]"
            style={{
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: p.duration,
              animationDelay: p.delay,
              boxShadow: "0 0 8px 2px rgba(255, 236, 170, 0.65)",
            }}
          />
        ))}
      </div>

      {/* 5. Deep Dark Studio Console Filter for Stem Studio mode */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b from-[#050b07]/85 via-[#08120a]/80 to-[#030604]/92 transition-opacity duration-500 ease-out",
          isStudio ? "opacity-100" : "opacity-0",
        )}
        style={{ willChange: "opacity" }}
      />
    </div>
  )
})
