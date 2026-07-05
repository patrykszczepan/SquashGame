import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EditSeasonForm } from "./EditSeasonForm"

export default async function EditSeasonPage({
  params,
}: {
  params: Promise<{ id: string; seasonId: string }>
}) {
  const { id: competitionId, seasonId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/dashboard/center")

  const { data: season } = await supabase
    .from("seasons")
    .select(`
      id, name, status, start_date, end_date,
      sets_to_win, scoring_type, default_scoring_config,
      competitions!inner(id, name, center_id)
    `)
    .eq("id", seasonId)
    .single()

  if (!season || (season.competitions as any).center_id !== center.id) notFound()

  return (
    <EditSeasonForm
      competitionId={competitionId}
      competitionName={(season.competitions as any).name}
      season={season as any}
    />
  )
}
