"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

async function getMyCenter() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  return data ? { ...data, userId: user.id } : null
}

async function verifyLeagueOwnership(supabase: any, leagueId: string, centerId: string) {
  const { data } = await supabase
    .from("leagues")
    .select("id, seasons!inner(competitions!inner(center_id))")
    .eq("id", leagueId)
    .single()
  if (!data) return false
  return (data.seasons as any).competitions.center_id === centerId
}

export async function updateLeague(
  leagueId: string,
  form: {
    name: string
    level: number
    round_robin_mode: "single" | "double"
    sets_to_win: number
    promotions: number | null
    demotions: number | null
  }
) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const owned = await verifyLeagueOwnership(supabase, leagueId, center.id)
  if (!owned) return { error: "Brak dostępu." }

  const { error } = await supabase
    .from("leagues")
    .update({
      name: form.name.trim(),
      level: form.level,
      round_robin_mode: form.round_robin_mode,
      match_format: { type: "race_to", sets_to_win: form.sets_to_win },
      promotions: form.promotions,
      demotions: form.demotions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leagueId)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/center/competitions")
  return {}
}

export async function archiveLeague(leagueId: string, archive: boolean) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const owned = await verifyLeagueOwnership(supabase, leagueId, center.id)
  if (!owned) return { error: "Brak dostępu." }

  const { error } = await supabase
    .from("leagues")
    .update({ is_archived: archive, updated_at: new Date().toISOString() })
    .eq("id", leagueId)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/center/competitions")
  return {}
}

export async function deleteLeague(leagueId: string) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const owned = await verifyLeagueOwnership(supabase, leagueId, center.id)
  if (!owned) return { error: "Brak dostępu." }

  const { error } = await supabase
    .from("leagues")
    .delete()
    .eq("id", leagueId)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/center/competitions")
  return {}
}
