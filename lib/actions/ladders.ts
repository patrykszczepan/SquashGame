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

export async function createLadder(form: {
  competition_id: string
  name: string
  max_challenge_distance?: number
  challenge_deadline_days?: number
  protection_days?: number
}) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("ladders")
    .insert({
      competition_id: form.competition_id,
      name: form.name,
      max_challenge_distance: form.max_challenge_distance ?? 2,
      challenge_deadline_days: form.challenge_deadline_days ?? 7,
      protection_days: form.protection_days ?? 3,
      status: "active",
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/center/competitions/${form.competition_id}`)
  return { id: data.id }
}

export async function getCompetitionLadders(competitionId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("ladders")
    .select(`
      id, name, max_challenge_distance, challenge_deadline_days, protection_days, status,
      ladder_positions(count)
    `)
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function getLadderDetail(ladderId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("ladders")
    .select(`
      id, name, max_challenge_distance, challenge_deadline_days, protection_days, status,
      competition_id,
      competitions(name, center_id, centers(name, slug), slug),
      ladder_positions(
        id, position, previous_position, protected_until, profile_id,
        players(first_name, last_name)
      ),
      challenges(
        id, challenger_id, challenged_id, status, deadline, match_id,
        challenger:players!challenges_challenger_id_fkey(first_name, last_name),
        challenged:players!challenges_challenged_id_fkey(first_name, last_name)
      )
    `)
    .eq("id", ladderId)
    .single()
  return data
}

export async function addLadderPlayer(
  ladderId: string,
  profileId: string,
  position?: number
) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()

  // If no position given, append at the end
  if (!position) {
    const { count } = await supabase
      .from("ladder_positions")
      .select("*", { count: "exact", head: true })
      .eq("ladder_id", ladderId)
    position = (count ?? 0) + 1
  }

  const { error } = await supabase.from("ladder_positions").insert({
    ladder_id: ladderId,
    profile_id: profileId,
    position,
    position_changed_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }

  // Log to history
  await supabase.from("ladder_position_history").insert({
    ladder_id: ladderId,
    profile_id: profileId,
    position,
  })

  revalidatePath(`/dashboard/center`)
  return {}
}

export async function removeLadderPlayer(ladderId: string, profileId: string) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("ladder_positions")
    .delete()
    .eq("ladder_id", ladderId)
    .eq("profile_id", profileId)

  if (error) return { error: error.message }
  return {}
}

export async function sendChallenge(ladderId: string, challengedId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nie jesteś zalogowany." }

  const { data: ladder } = await supabase
    .from("ladders")
    .select("id, max_challenge_distance, challenge_deadline_days, status")
    .eq("id", ladderId)
    .single()
  if (!ladder || ladder.status !== "active") return { error: "Drabinka nieaktywna." }

  // Get positions
  const { data: myPos } = await supabase
    .from("ladder_positions")
    .select("position, protected_until")
    .eq("ladder_id", ladderId)
    .eq("profile_id", user.id)
    .single()
  if (!myPos) return { error: "Nie jesteś w tej drabince." }

  const { data: theirPos } = await supabase
    .from("ladder_positions")
    .select("position, protected_until")
    .eq("ladder_id", ladderId)
    .eq("profile_id", challengedId)
    .single()
  if (!theirPos) return { error: "Rywal nie jest w tej drabince." }

  if (theirPos.position >= myPos.position)
    return { error: "Możesz wyzwać tylko kogoś wyżej na drabince." }

  if (myPos.position - theirPos.position > ladder.max_challenge_distance)
    return { error: `Możesz wyzwać maksymalnie ${ladder.max_challenge_distance} pozycje wyżej.` }

  // Check protection
  if (theirPos.protected_until && new Date(theirPos.protected_until) > new Date())
    return { error: "Rywal jest chroniony po ostatnim meczu." }

  // Check for existing open challenge
  const { data: existing } = await supabase
    .from("challenges")
    .select("id")
    .eq("ladder_id", ladderId)
    .eq("challenger_id", user.id)
    .in("status", ["pending", "accepted"])
    .maybeSingle()
  if (existing) return { error: "Masz już otwarte wyzwanie w tej drabince." }

  const deadline = new Date()
  deadline.setDate(deadline.getDate() + ladder.challenge_deadline_days)

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      ladder_id: ladderId,
      challenger_id: user.id,
      challenged_id: challengedId,
      deadline: deadline.toISOString().split("T")[0],
      status: "pending",
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  // Notify challenged player
  await supabase.from("notifications").insert({
    profile_id: challengedId,
    type: "challenge_received",
    channel: "in_app",
    title: "Nowe wyzwanie na drabince",
    body: "Ktoś wyzwał Cię na mecz w drabince challenge.",
    data: { challenge_id: data.id, ladder_id: ladderId },
    status: "sent",
    sent_at: new Date().toISOString(),
  })

  revalidatePath("/dashboard/player/ladders")
  return { id: data.id }
}

export async function acceptChallenge(challengeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nie jesteś zalogowany." }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, ladder_id, challenger_id, challenged_id, status")
    .eq("id", challengeId)
    .single()

  if (!challenge) return { error: "Wyzwanie nie istnieje." }
  if (challenge.challenged_id !== user.id) return { error: "Brak dostępu." }
  if (challenge.status !== "pending") return { error: "Wyzwanie nie jest oczekujące." }

  // Create match
  const { data: match, error: mErr } = await supabase
    .from("matches")
    .insert({
      ladder_id: challenge.ladder_id,
      player_a_id: challenge.challenger_id,
      player_b_id: challenge.challenged_id,
      status: "scheduled",
    })
    .select("id")
    .single()

  if (mErr || !match) return { error: mErr?.message ?? "Błąd tworzenia meczu." }

  const { error } = await supabase
    .from("challenges")
    .update({ status: "accepted", match_id: match.id, updated_at: new Date().toISOString() })
    .eq("id", challengeId)

  if (error) return { error: error.message }

  revalidatePath("/dashboard/player/ladders")
  return { match_id: match.id }
}

export async function declineChallenge(challengeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nie jesteś zalogowany." }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, challenged_id, challenger_id, status")
    .eq("id", challengeId)
    .single()

  if (!challenge) return { error: "Wyzwanie nie istnieje." }
  if (challenge.challenged_id !== user.id) return { error: "Brak dostępu." }
  if (challenge.status !== "pending") return { error: "Wyzwanie nie jest oczekujące." }

  const { error } = await supabase
    .from("challenges")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", challengeId)

  if (error) return { error: error.message }

  revalidatePath("/dashboard/player/ladders")
  return {}
}

export async function processLadderPositions(challengeId: string) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, ladder_id, challenger_id, challenged_id, match_id, status")
    .eq("id", challengeId)
    .single()

  if (!challenge || challenge.status !== "accepted")
    return { error: "Wyzwanie nie jest zaakceptowane." }
  if (!challenge.match_id) return { error: "Brak powiązanego meczu." }

  const { data: match } = await supabase
    .from("matches")
    .select("winner_id, status")
    .eq("id", challenge.match_id)
    .single()

  if (!match || match.status !== "finished")
    return { error: "Mecz nie jest zakończony." }

  const { data: ladder } = await supabase
    .from("ladders")
    .select("protection_days")
    .eq("id", challenge.ladder_id)
    .single()

  const { data: challengerPos } = await supabase
    .from("ladder_positions")
    .select("id, position")
    .eq("ladder_id", challenge.ladder_id)
    .eq("profile_id", challenge.challenger_id)
    .single()

  const { data: challengedPos } = await supabase
    .from("ladder_positions")
    .select("id, position")
    .eq("ladder_id", challenge.ladder_id)
    .eq("profile_id", challenge.challenged_id)
    .single()

  if (!challengerPos || !challengedPos) return { error: "Brak pozycji zawodników." }

  const now = new Date()
  const protectionUntil = new Date()
  protectionUntil.setDate(now.getDate() + (ladder?.protection_days ?? 3))

  if (match.winner_id === challenge.challenger_id) {
    // Challenger wins → swap positions
    await supabase
      .from("ladder_positions")
      .update({
        position: challengedPos.position,
        previous_position: challengerPos.position,
        position_changed_at: now.toISOString(),
        protected_until: protectionUntil.toISOString(),
      })
      .eq("id", challengerPos.id)

    await supabase
      .from("ladder_positions")
      .update({
        position: challengerPos.position,
        previous_position: challengedPos.position,
        position_changed_at: now.toISOString(),
        protected_until: null,
      })
      .eq("id", challengedPos.id)

    // Log history
    await supabase.from("ladder_position_history").insert([
      { ladder_id: challenge.ladder_id, profile_id: challenge.challenger_id, position: challengedPos.position },
      { ladder_id: challenge.ladder_id, profile_id: challenge.challenged_id, position: challengerPos.position },
    ])
  } else {
    // Challenged wins → give protection
    await supabase
      .from("ladder_positions")
      .update({ protected_until: protectionUntil.toISOString() })
      .eq("id", challengedPos.id)
  }

  // Mark challenge as played
  await supabase
    .from("challenges")
    .update({ status: "played", updated_at: now.toISOString() })
    .eq("id", challengeId)

  revalidatePath(`/dashboard/center`)
  return {}
}

export async function getMyChallenges() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("challenges")
    .select(`
      id, status, deadline, match_id,
      ladder_id,
      ladders(name, competition_id, competitions(name, centers(name))),
      challenger:players!challenges_challenger_id_fkey(first_name, last_name),
      challenged:players!challenges_challenged_id_fkey(first_name, last_name)
    `)
    .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function getMyLadders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("ladder_positions")
    .select(`
      id, position, previous_position, protected_until,
      ladder_id,
      ladders(id, name, status, max_challenge_distance, competition_id,
        competitions(name, centers(name)),
        ladder_positions(id, position, profile_id, players(first_name, last_name))
      )
    `)
    .eq("profile_id", user.id)
  return data ?? []
}
