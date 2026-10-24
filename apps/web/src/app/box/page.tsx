"use client"

import MusicBox from "@/components/music-box/music-box"
import { useStudio } from "@/context/studio-context"

export default function MusicBoxPage() {
  const { tracks, setTracks } = useStudio()

  return (
    <MusicBox
      tracks={tracks}
      setTracks={setTracks}
      onTrackSelect={(id) => {
        window.history.pushState(null, "", `/box/${id}`)
      }}
    />
  )
}

