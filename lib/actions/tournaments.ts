"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  planSingleElimination,
  nextRoundPosition,
  partnerPosition,
} from "@/lib/schedule/bracket"

async function getMyCenter() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("centers")
    .select("id, name")
    .eq("profile_id", user.id)
    .single()
  return data ? { ...data, userId: user.id } : null
}

export async function createTournament(form: {
  competition_id: string
  name: string
  format: "single_elimination"
  seeding_type?: string
}) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      competition_id: form.competition_id,
      name: form.name,
      format: form.format,
      seeding_type: form.seeding_type ?? "manual",
      status: "draft",
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/center/competitions/${form.competition_id}`)
  return { id: data.id }
}

export async function getCompetitionTournaments(competitionId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tournaments")
    .select("id, name, format, seeding_type, status, created_at")
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function addTournamentPlayer(tournamentId: string, profileId: string) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  // Check tournament exists and is in draft
  const { data: t } = await supabase
    .from("tournaments")
    .select("id, status, config")
    .eq("id", tournamentId)
    .single()
  if (!t) return { error: "Turniej nie istnieje." }
  if (t.status !== "draft") return { error: "Turniej już wystartował." }

  const currentPlayers: string[] = (t.config as any)?.players ?? []
  if (currentPlayers.includes(profileId)) return { error: "Zawodnik już zapisany." }

  const { error } = await supabase
    .from("tournaments")
    .update({ config: { ...((t.config as any) ?? {}), players: [...currentPlayers, profileId] } })
    .eq("id", tournamentId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/center`)
  return {}
}

export async function removeTournamentPlayer(tournamentId: string, profileId: string) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { data: t } = await supabase
    .from("tournaments")
    .select("id, status, config")
    .eq("id", tournamentId)
    .single()
  if (!t || t.status !== "draft") return { error: "Nie można edytować." }

  const currentPlayers: string[] = (t.config as any)?.players ?? []
  const { error } = await supabase
    .from("tournaments")
    .update({
      config: {
        ...((t.config as any) ?? {}),
        players: currentPlayers.filter((p) => p !== profileId),
      },
    })
    .eq("id", tournamentId)

  if (error) return { error: error.message }
  return {}
}

export async function generateTournamentBracket(tournamentId: string) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { data: t } = await supabase
    .from("tournaments")
    .select("id, status, config, competition_id")
    .eq("id", tournamentId)
    .single()
  if (!t) return { error: "Turniej nie istnieje." }
  if (t.status !== "draft") return { error: "Bracket już wygenerowany." }

  const playerIds: string[] = (t.config as any)?.players ?? []
  if (playerIds.length < 2) return { error: "Potrzeba co najmniej 2 zawodników." }

  const plan = planSingleElimination(playerIds)

  // Insert all slots
  const slotsToInsert = plan.slots.map((s) => ({
    tournament_id: tournamentId,
    round: s.round,
    position: s.position,
    profile_id: s.playerId ?? null,
    is_bye: s.isBye,
    match_id: null as string | null,
  }))
  const { error: slotErr } = await supabase.from("tournament_slots").insert(slotsToInsert)
  if (slotErr) return { error: slotErr.message }

  // Re-fetch slots (need IDs)
  const { data: dbSlots } = await supabase
    .from("tournament_slots")
    .select("id, round, position, profile_id, is_bye")
    .eq("tournament_id", tournamentId)

  if (!dbSlots) return { error: "Błąd pobierania slotów." }

  const slotMap = new Map(
    dbSlots.map((s: any) => [`${s.round}-${s.position}`, s])
  )

  // Create round-1 matches for non-bye pairs
  let matchCount = 0
  for (const bm of plan.matches.filter((m) => m.round === 1)) {
    const slotA = slotMap.get(`1-${bm.position_a}`) as any
    const slotB = slotMap.get(`1-${bm.position_b}`) as any
    if (!slotA || !slotB) continue

    const { data: match, error: mErr } = await supabase
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        player_a_id: slotA.profile_id,
        player_b_id: slotB.profile_id,
        status: "scheduled",
      })
      .select("id")
      .single()

    if (mErr || !match) continue
    matchCount++

    // Link match to both slots
    await supabase
      .from("tournament_slots")
      .update({ match_id: match.id })
      .in("id", [slotA.id, slotB.id])
  }

  // Auto-advance bye pairs
  for (let i = 0; i < plan.bracketSize / 2; i++) {
    const posA = 2 * i + 1
    const posB = 2 * i + 2
    const slotA = slotMap.get(`1-${posA}`) as any
    const slotB = slotMap.get(`1-${posB}`) as any
    if (!slotA || !slotB) continue

    if (slotA.is_bye && !slotB.is_bye) {
      // B advances
      const nextPos = nextRoundPosition(posB)
      await supabase
        .from("tournament_slots")
        .update({ profile_id: slotB.profile_id })
        .eq("tournament_id", tournamentId)
        .eq("round", 2)
        .eq("position", nextPos)
    } else if (!slotA.is_bye && slotB.is_bye) {
      // A advances
      const nextPos = nextRoundPosition(posA)
      await supabase
        .from("tournament_slots")
        .update({ profile_id: slotA.profile_id })
        .eq("tournament_id", tournamentId)
        .eq("round", 2)
        .eq("position", nextPos)
    }
  }

  // Activate tournament
  await supabase
    .from("tournaments")
    .update({ status: "active" })
    .eq("id", tournamentId)

  revalidatePath(`/dashboard/center`)
  return { matches: matchCount }
}

export async function submitTournamentResult(
  matchId: string,
  sets: Array<{ points_a: number; points_b: number }>
) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { data: match } = await supabase
    .from("matches")
    .select("id, player_a_id, player_b_id, tournament_id, status")
    .eq("id", matchId)
    .single()

  if (!match || !match.tournament_id) return { error: "Mecz nie istnieje." }
  if (match.status !== "scheduled") return { error: "Mecz nie jest w stanie 'zaplanowany'." }

  let setsA = 0, setsB = 0
  for (const s of sets) {
    if (s.points_a > s.points_b) setsA++
    else setsB++
  }
  const winnerId = setsA > setsB ? match.player_a_id : match.player_b_id

  // Update match
  const { error: mErr } = await supabase
    .from("matches")
    .update({
      status: "finished",
      winner_id: winnerId,
      result_source: "center",
      submitted_by: center.userId,
      submitted_at: new Date().toISOString(),
      confirmed_by: center.userId,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
  if (mErr) return { error: mErr.message }

  // Insert sets
  await supabase.from("match_sets").delete().eq("match_id", matchId)
  await supabase.from("match_sets").insert(
    sets.map((s, i) => ({
      match_id: matchId,
      set_number: i + 1,
      points_a: s.points_a,
      points_b: s.points_b,
    }))
  )

  // Advance winner in bracket
  const { data: slots } = await supabase
    .from("tournament_slots")
    .select("id, round, position, profile_id")
    .eq("tournament_id", match.tournament_id)
    .eq("match_id", matchId)

  if (slots && slots.length === 2) {
    const winnerSlot = (slots as any[]).find((s) => s.profile_id === winnerId)
    if (winnerSlot) {
      // Fetch tournament to get total rounds
      const { data: t } = await supabase
        .from("tournaments")
        .select("config")
        .eq("id", match.tournament_id)
        .single()
      const playerCount = ((t?.config as any)?.players ?? []).length
      const totalRounds = Math.ceil(Math.log2(playerCount))

      if (winnerSlot.round < totalRounds) {
        const nextRound = winnerSlot.round + 1
        const nextPos = nextRoundPosition(winnerSlot.position)

        // Place winner in next round slot
        await supabase
          .from("tournament_slots")
          .update({ profile_id: winnerId })
          .eq("tournament_id", match.tournament_id)
          .eq("round", nextRound)
          .eq("position", nextPos)

        // Check if partner slot is also filled
        const partnerPos = partnerPosition(nextPos)
        const { data: partnerSlot } = await supabase
          .from("tournament_slots")
          .select("id, profile_id")
          .eq("tournament_id", match.tournament_id)
          .eq("round", nextRound)
          .eq("position", partnerPos)
          .single()

        if (partnerSlot?.profile_id) {
          // Create next round match
          const playerA = nextPos % 2 === 1 ? winnerId : partnerSlot.profile_id
          const playerB = nextPos % 2 === 1 ? partnerSlot.profile_id : winnerId
          const { data: newMatch } = await supabase
            .from("matches")
            .insert({
              tournament_id: match.tournament_id,
              player_a_id: playerA,
              player_b_id: playerB,
              status: "scheduled",
            })
            .select("id")
            .single()

          if (newMatch) {
            await supabase
              .from("tournament_slots")
              .update({ match_id: newMatch.id })
              .eq("tournament_id", match.tournament_id)
              .eq("round", nextRound)
              .in("position", [nextPos, partnerPos])
          }
        }
      } else {
        // Final round — tournament finished
        await supabase
          .from("tournaments")
          .update({ status: "finished" })
          .eq("id", match.tournament_id)
      }
    }
  }

  revalidatePath(`/dashboard/center`)
  return { winner_id: winnerId }
}

export async function getTournamentDetail(tournamentId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tournaments")
    .select(`
      id, name, format, seeding_type, status, config, competition_id,
      tournament_slots(id, round, position, profile_id, is_bye, match_id),
      competitions(name, center_id, centers(name, slug), slug)
    `)
    .eq("id", tournamentId)
    .single()
  return data
}

export async function getMyTournaments() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("tournament_slots")
    .select(`
      tournament_id, round, position,
      tournaments(id, name, format, status, competitions(name, centers(name)))
    `)
    .eq("profile_id", user.id)
  return data ?? []
}
