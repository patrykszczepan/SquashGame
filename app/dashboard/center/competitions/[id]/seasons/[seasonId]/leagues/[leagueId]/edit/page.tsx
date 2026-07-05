import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EditLeagueForm } from "./EditLeagueForm"

export default async function EditLeaguePage({
  params,
}: {
  params: Promise<{ id: string; seasonId: string; leagueId: string }>
}) {
  const { id: competitionId, seasonId, leagueId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/dashboard/center")

  const { data: league } = await supabase
    .from("leagues")
    .select(`
      id, name, level, round_robin_mode, match_format,
      promotions, demotions,
      seasons!inner(id, name, competitions!inner(id, name, center_id))
    `)
    .eq("id", leagueId)
    .single()

  if (!league || (league.seasons as any).competitions.center_id !== center.id) notFound()

  const season = league.seasons as any
  const competition = season.competitions

  return (
    <EditLeagueForm
      competitionId={competitionId}
      competitionName={competition.name}
      seasonId={seasonId}
      seasonName={season.name}
      league={league as any}
    />
  )
}
