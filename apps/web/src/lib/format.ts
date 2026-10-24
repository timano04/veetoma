export function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const m = Math.floor(safe / 60)
  const s = Math.floor(safe % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`
}

export function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, "")
}

export function getExtension(name: string) {
  const match = name.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : ""
}

export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = "metadata"
    const finish = (duration: number) => {
      URL.revokeObjectURL(url)
      resolve(duration)
    }
    audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) ? audio.duration : 0)
    audio.onerror = () => finish(0)
    audio.src = url
  })
}
