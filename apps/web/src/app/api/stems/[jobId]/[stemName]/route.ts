import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"
import { Readable } from "stream"

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string; stemName: string } }
) {
  const { jobId, stemName } = params
  const fileName = stemName.endsWith(".wav") ? stemName : `${stemName}.wav`
  const localPath = path.resolve("d:/veetoma/storage/stems", jobId, fileName)

  // 1. Direct local storage streaming (zero-latency, lossless audio stream)
  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath)
    const fileSize = stat.size
    const range = request.headers.get("range")

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

      if (start >= fileSize || end >= fileSize) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        })
      }

      const chunkSize = end - start + 1
      const nodeStream = fs.createReadStream(localPath, { start, end })
      const webStream = Readable.toWeb(nodeStream)

      return new Response(webStream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": "audio/wav",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      })
    }

    const nodeStream = fs.createReadStream(localPath)
    const webStream = Readable.toWeb(nodeStream)

    return new Response(webStream as any, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": "audio/wav",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  }

  // 2. Fallback to Spring Boot
  try {
    const backendHeaders: Record<string, string> = {}
    const rangeHeader = request.headers.get("range")
    if (rangeHeader) backendHeaders["Range"] = rangeHeader

    const res = await fetch(`http://localhost:8080/api/files/stems/${jobId}/${fileName}`, {
      headers: backendHeaders,
    })

    const responseHeaders = new Headers()
    responseHeaders.set("Content-Type", res.headers.get("Content-Type") || "audio/wav")
    responseHeaders.set("Accept-Ranges", "bytes")
    if (res.headers.get("Content-Length")) responseHeaders.set("Content-Length", res.headers.get("Content-Length")!)
    if (res.headers.get("Content-Range")) responseHeaders.set("Content-Range", res.headers.get("Content-Range")!)

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    })
  } catch (err) {
    return new Response("Stem audio not found", { status: 404 })
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { jobId: string; stemName: string } }
) {
  const { jobId, stemName } = params
  const fileName = stemName.endsWith(".wav") ? stemName : `${stemName}.wav`
  const localPath = path.resolve("d:/veetoma/storage/stems", jobId, fileName)

  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath)
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Length": stat.size.toString(),
        "Content-Type": "audio/wav",
        "Accept-Ranges": "bytes",
      },
    })
  }

  return new Response(null, { status: 404 })
}
