import { redirect } from "next/navigation"

export default function SpaceRootRedirectPage({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/stem/${params.id}/step4`)
}
