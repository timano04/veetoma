"use client"

import { useParams } from "next/navigation"
import MusicBox from "@/components/music-box/music-box"
import { useStudio } from "@/context/studio-context"

export default function MusicBoxDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { tracks, setTracks } = useStudio()

  return (
    <MusicBox
      tracks={tracks}
      setTracks={setTracks}
      initialTrackId={id}
      onTrackSelect={(trackId) => {
        window.history.pushState(null, "", `/box/${trackId}`)
      }}
    />
  )
}


