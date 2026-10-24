export type Track = {
  id: string
  title: string
  artist: string
  duration: number
  source: "demo" | "upload" | "musicbox"
  src?: string
  cover?: string
  size?: number
  ext?: string
  album?: string
  genre?: string
}

export type RepeatMode = "off" | "all" | "one"

