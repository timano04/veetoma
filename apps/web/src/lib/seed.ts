export function hashString(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type WaveStyle = "spiky" | "smooth" | "phrases" | "sustained"

export function generatePeaks(seed: string, count: number, style: WaveStyle): number[] {
  const hash = hashString(seed)
  const rand = mulberry32(hash)
  const phase = (hash % 628) / 100
  const peaks: number[] = []

  for (let i = 0; i < count; i++) {
    const pos = i / count
    const section = 0.7 + 0.3 * Math.sin(pos * 14 + phase)
    const arc = Math.pow(Math.sin(Math.PI * Math.min(1, pos * 1.02)), 0.5)
    const envelope = (0.35 + 0.65 * arc) * section

    let v: number
    switch (style) {
      case "spiky":
        v = rand() > 0.55 ? 0.55 + rand() * 0.45 : 0.1 + rand() * 0.2
        break
      case "smooth":
        v = 0.5 + 0.3 * Math.sin(i * 0.35 + phase) + (rand() - 0.5) * 0.15
        break
      case "phrases":
        v = (Math.sin(i * 0.18 + phase) > -0.2 ? 1 : 0.12) * (0.35 + rand() * 0.6)
        break
      default:
        v = 0.3 + rand() * 0.5
    }
    peaks.push(Math.max(0.05, Math.min(1, v * envelope)))
  }
  return peaks
}
