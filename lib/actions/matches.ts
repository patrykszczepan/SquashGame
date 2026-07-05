"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ---- result submission (player flow) ----------------------------------------

export async function submitMatchResult(
  matchId: string,
  sets: Array<{ points_a: number; points_b: number }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nie jesteś zalogowany." }

  const { data: match } = await supabase
    .from("matches")
    .select("id, player_a_id, player_b_id, status, league_id, leagues(result_confirm_days)")
    .eq("id", matchId)
    .single()

  if (!match) return { error: "Mecz nie istnieje." }
  if (match.player_a_id !== user.id && match.player_b_id !== user.id)
    return { error: "Brak dostępu." }
  if (match.status !== "scheduled" && match.status !== "postponed")
    return { error: "Nie można wpisać wyniku dla tego meczu." }

  // Determine winner from sets
  let setsA = 0, setsB = 0
  for (const s of sets) {
    if (s.points_a > s.points_b) setsA++
    else setsB++
  }
  const winnerId = setsA > setsB ? match.player_a_id : match.player_b_id

  // Auto-confirm deadline
  const confirmDays = ((match.leagues as unknown as { result_confirm_days: number } | null))?.result_confirm_days ?? 3
  const autoConfirmAt = new Date()
  autoConfirmAt.setDate(autoConfirmAt.getDate() + confirmDays)

  const { error: matchErr } = await supabase
    .from("matches")
    .update({
      status: "pending_confirmation",
      winner_id: winnerId,
      result_source: "player",
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
      auto_confirm_at: autoConfirmAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)

  if (matchErr) return { error: matchErr.message }

  // Insert sets
  await supabase.from("match_sets").delete().eq("match_id", matchId)
  const setsToInsert = sets.map((s, i) => ({
    match_id: matchId,
    set_number: i + 1,
    points_a: s.points_a,
    points_b: s.points_b,
  }))
  const { error: setsErr } = await supabase.from("match_sets").insert(setsToInsert)
  if (setsErr) return { error: setsErr.message }

  // Log event
  await supabase.from("match_events").insert({
    match_id: matchId,
    event_type: "result_submitted",
    actor_id: user.id,
    new_data: { sets, winner_id: winnerId },
  })

  // Notify the other player
  const otherId = user.id === match.player_a_id ? match.player_b_id : match.player_a_id
  await supabase.from("notifications").insert({
    profile_id: otherId,
    type: "match_result_to_confirm",
    channel: "in_app",
    title: "Wynik meczu do potwierdzenia",
    body: "Rywal wpisał wynik meczu. Sprawdź i potwierdź.",
    data: { match_id: matchId },
    status: "sent",
    sent_at: new Date().toISOString(),
  })

  revalidatePath("/dashboard/player/matches")
  return {}
}

// ---- result confirmation (opponent) -----------------------------------------

export async function confirmMatchResult(matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nie jesteś zalogowany." }

  const { data: match } = await supabase
    .from("matches")
    .select("id, player_a_id, player_b_id, submitted_by, status")
    .eq("id", matchId)
    .single()

  if (!match) return { error: "Mecz nie istnieje." }
  if (match.status !== "pending_confirmation") return { error: "Mecz nie czeka na potwierdzenie." }
  if (match.submitted_by === user.id) return { error: "Nie możesz potwierdzić własnego wyniku." }
  if (match.player_a_id !== user.id && match.player_b_id !== user.id)
    return { error: "Brak dostępu." }

  const { error } = await supabase
    .from("matches")
    .update({
      status: "finished",
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)

  if (error) return { error: error.message }

  await supabase.from("match_events").insert({
    match_id: matchId,
    event_type: "result_confirmed",
    actor_id: user.id,
  })

  // Notify submitter
  await supabase.from("notifications").insert({
    profile_id: match.submitted_by,
    type: "match_result_confirmed",
    channel: "in_app",
    title: "Wynik meczu potwierdzony",
    body: "Rywal potwierdził wynik meczu.",
    data: { match_id: matchId },
    status: "sent",
    sent_at: new Date().toISOString(),
  })

  revalidatePath("/dashboard/player/matches")
  return {}
}

// ---- dispute ----------------------------------------------------------------

export async function disputeMatchResult(matchId: string, note?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nie jesteś zalogowany." }

  const { data: match } = await supabase
    .from("matches")
    .select("id, player_a_id, player_b_id, status, submitted_by")
    .eq("id", matchId)
    .single()

  if (!match || match.status !== "pending_confirmation") return { error: "Nieprawidłowy stan meczu." }
  if (match.submitted_by === user.id) return { error: "Nie możesz zakwestionować własnego wyniku." }

  const { error } = await supabase
    .from("matches")
    .update({
      status: "scheduled",
      disputed_by: user.id,
      disputed_at: new Date().toISOString(),
      winner_id: null,
      submitted_by: null,
      submitted_at: null,
      auto_confirm_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)

  if (error) return { error: error.message }

  await supabase.from("match_events").insert({
    match_id: matchId,
    event_type: "result_disputed",
    actor_id: user.id,
    note: note || null,
  })

  revalidatePath("/dashboard/player/matches")
  return {}
}

// ---- center: paper card entry -----------------------------------------------

export async function centerSubmitResult(
  matchId: string,
  sets: Array<{ points_a: number; points_b: number }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nie jesteś zalogowany." }

  const { data: match } = await supabase
    .from("matches")
    .select("id, player_a_id, player_b_id")
    .eq("id", matchId)
    .single()
  if (!match) return { error: "Mecz nie istnieje." }

  let setsA = 0, setsB = 0
  for (const s of sets) {
    if (s.points_a > s.points_b) setsA++
    else setsB++
  }
  const winnerId = setsA > setsB ? match.player_a_id : match.player_b_id

  await supabase.from("matches").update({
    status: "finished",
    winner_id: winnerId,
    result_source: "center",
    submitted_by: user.id,
    submitted_at: new Date().toISOString(),
    confirmed_by: user.id,
    confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", matchId)

  await supabase.from("match_sets").delete().eq("match_id", matchId)
  await supabase.from("match_sets").insert(
    sets.map((s, i) => ({
      match_id: matchId,
      set_number: i + 1,
      points_a: s.points_a,
      points_b: s.points_b,
    }))
  )

  await supabase.from("match_events").insert({
    match_id: matchId,
    event_type: "result_submitted",
    actor_id: user.id,
    new_data: { sets, winner_id: winnerId, source: "center" },
  })

  // Notify both players
  for (const pid of [match.player_a_id, match.player_b_id]) {
    await supabase.from("notifications").insert({
      profile_id: pid,
      type: "match_result_entered_by_center",
      channel: "in_app",
      title: "Wynik meczu wpisany przez centrum",
      body: "Centrum wpisało wynik Twojego meczu.",
      data: { match_id: matchId },
      status: "sent",
      sent_at: new Date().toISOString(),
    })
  }

  revalidatePath("/dashboard/center/results")
  return {}
}

// ---- player: get my matches -------------------------------------------------

export async function getMyMatches() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("matches")
    .select(`
      *,
      match_sets(*),
      rounds(name, number, deadline),
      player_a:profiles!matches_player_a_id_fkey(id),
      player_b:profiles!matches_player_b_id_fkey(id),
      player_a_data:players!inner(first_name, last_name),
      player_b_data:players!inner(first_name, last_name)
    `)
    .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(50)

  return (data ?? []) as unknown[]
}

// ---- notifications ----------------------------------------------------------

export async function getMyNotifications() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", user.id)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(20)

  return data ?? []
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
}
