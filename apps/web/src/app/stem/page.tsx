"use client"

import { useRouter } from "next/navigation"
import { SpaceGallery } from "@/components/stem-studio/space-gallery"
import { useStudio } from "@/context/studio-context"

export default function StemStudioGalleryPage() {
  const router = useRouter()
  const {
    spaces,
    tracks,
    error,
    setActiveSpaceId,
    deleteSpace,
    createSpaceFromUpload,
    createSpaceFromTrack,
  } = useStudio()

  const handleOpenSpace = (id: string) => {
    setActiveSpaceId(id)
    const targetSpace = spaces.find((s) => s.id === id)
    const targetStep = targetSpace?.step || (targetSpace?.status === "ready" ? 4 : 1)
    router.push(`/stem/${id}/step${targetStep}`)
  }

  const handleUploadFile = async (file: File) => {
    const newId = await createSpaceFromUpload(file)
    if (newId) {
      router.push(`/stem/${newId}/step1`)
    }
  }

  const handleSelectTrack = async (track: any) => {
    const newId = await createSpaceFromTrack(track)
    if (newId) {
      router.push(`/stem/${newId}/step1`)
    }
  }

  return (
    <SpaceGallery
      spaces={spaces}
      tracks={tracks}
      error={error}
      onOpen={handleOpenSpace}
      onDelete={deleteSpace}
      onFile={handleUploadFile}
      onTrack={handleSelectTrack}
    />
  )
}
