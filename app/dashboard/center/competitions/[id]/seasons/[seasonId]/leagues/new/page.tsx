import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NewLeagueForm } from "./NewLeagueForm"

export default async function NewLeaguePage({
  params,
}: {
  params: Promise<{ id: string; seasonId: string }>
}) {
  const { id: competitionId, seasonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: season } = await supabase
    .from("seasons")
    .select("default_promotions, default_demotions")
    .eq("id", seasonId)
    .single()

  return (
    <NewLeagueForm
      competitionId={competitionId}
      seasonId={seasonId}
      defaultPromotions={season?.default_promotions ?? 2}
      defaultDemotions={season?.default_demotions ?? 2}
    />
  )
}
