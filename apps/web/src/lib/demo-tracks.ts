import type { Track } from "@/components/music-box/types"

const BYTES_PER_SECOND = 176_400

function demo(id: string, title: string, artist: string, duration: number, cover: string, src: string, ext = "mp3"): Track {
  return { id, title, artist, duration, cover, src, source: "demo", ext, size: duration * BYTES_PER_SECOND }
}

export const DEMO_TRACKS: Track[] = [
  demo("demo-1", "Midnight Signal", "Veetoma Sessions", 214, "/music-1.jpg", "/audio/demo-1.mp3", "mp3"),
  demo("demo-2", "Glass Harbor", "Nova Lin", 187, "/beautifulthings.jpg", "/audio/demo-2.mp3", "mp3"),
  demo("demo-3", "Low Tide Parade", "The Quiet Engines", 242, "/fateofophelia.jpg", "/audio/demo-3.mp3", "mp3"),
  demo("demo-4", "Amber Frequencies", "Kito & Rae", 198, "/loosecontrols.jpg", "/audio/demo-1.mp3", "mp3"),
  demo("demo-5", "Velvet Static", "Mara Oyelaran", 226, "/album-art.png", "/audio/demo-2.mp3", "mp3"),
]
