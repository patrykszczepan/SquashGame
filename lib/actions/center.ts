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
  return data
}

export async function getPlayersAvailableForCompetition(competitionId: string) {
  const center = await getMyCenter()
  if (!center) return { registered: [], guests: [] }

  const supabase = await createClient()

  // Profile IDs already in this competition
  const { data: existing } = await supabase
    .from("competition_players")
    .select("profile_id")
    .eq("competition_id", competitionId)
  const existingIds = new Set((existing ?? []).map((r) => r.profile_id))

  // All registered players (public read) — filter out already assigned
  const { data: allPlayers } = await supabase
    .from("players")
    .select("profile_id, first_name, last_name, phone")
    .order("last_name")

  const registered = (allPlayers ?? []).filter(
    (p) => !existingIds.has(p.profile_id)
  )

  // Center's offline players
  const { data: guests } = await supabase
    .from("center_players")
    .select("id, first_name, last_name, email, phone")
    .eq("center_id", center.id)
    .eq("is_archived", false)
    .order("last_name")

  return { registered, guests: guests ?? [] }
}

export async function updateCenterSettings(form: {
  name: string
  slug: string
  description: string
  city: string
  address: string
  postal_code: string
  phone: string
  email: string
  nip: string
  num_courts: number
}) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()

  const slug = form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")

  const { error } = await supabase
    .from("centers")
    .update({
      name: form.name.trim(),
      slug: slug || null,
      description: form.description.trim() || null,
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      postal_code: form.postal_code.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      nip: form.nip.trim() || null,
      num_courts: Math.max(1, form.num_courts),
      updated_at: new Date().toISOString(),
    })
    .eq("id", center.id)

  if (error) {
    if (error.code === "23505") return { error: "Ten adres URL (slug) jest już zajęty. Wybierz inny." }
    return { error: error.message }
  }

  revalidatePath("/dashboard/center")
  return {}
}

export async function updateCenterPlayer(
  playerId: string,
  form: { first_name: string; last_name: string; email?: string; phone?: string }
) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("center_players")
    .update({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playerId)
    .eq("center_id", center.id)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/center/players")
  return {}
}

export async function archiveCenterPlayer(playerId: string, archive: boolean) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("center_players")
    .update({ is_archived: archive, updated_at: new Date().toISOString() })
    .eq("id", playerId)
    .eq("center_id", center.id)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/center/players")
  return {}
}

export async function deleteCenterPlayer(playerId: string) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("center_players")
    .delete()
    .eq("id", playerId)
    .eq("center_id", center.id)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/center/players")
  return {}
}

export async function addGuestPlayerToCenter(form: {
  first_name: string
  last_name: string
  email?: string
  phone?: string
}) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("center_players")
    .insert({
      center_id: center.id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
    })

  if (error) return { error: error.message }
  revalidatePath("/dashboard/center/players")
  return {}
}
