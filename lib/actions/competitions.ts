"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { generateRoundRobin } from "@/lib/schedule/generator"
import {
  DEFAULT_SCORING_CONFIG,
  DEFAULT_MATCH_FORMAT,
  buildLeagueScoringConfig,
  defaultAdvancedResults,
  type SeasonScoringConfig,
} from "@/lib/types"
import { nanoid } from "nanoid"

// ---- helpers ----------------------------------------------------------------

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

// ---- competitions -----------------------------------------------------------

export async function createCompetition(form: {
  name: string
  description?: string
  visibility: string
}) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const slug = slugify(form.name)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("competitions")
    .insert({
      center_id: center.id,
      name: form.name.trim(),
      slug,
      description: form.description?.trim() || null,
      visibility: form.visibility,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/dashboard/center/competitions")
  return { id: data.id }
}

export async function getMyCompetitions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!center) return []

  const { data } = await supabase
    .from("competitions")
    .select("*, seasons(id, name, status)")
    .eq("center_id", center.id)
    .order("created_at", { ascending: false })

  return data ?? []
}

// ---- seasons ----------------------------------------------------------------

export async function createSeason(form: {
  competition_id: string
  name: string
  start_date?: string
  end_date?: string
  sets_to_win?: number
  scoring_config?: SeasonScoringConfig
}) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { data: comp } = await supabase
    .from("competitions")
    .select("id")
    .eq("id", form.competition_id)
    .eq("center_id", center.id)
    .single()
  if (!comp) return { error: "Brak dostępu." }

  const setsToWin = form.sets_to_win ?? 3
  const scoringConfig: SeasonScoringConfig = form.scoring_config ?? {
    type: "advanced",
    results: defaultAdvancedResults(setsToWin),
  }

  const { data, error } = await supabase
    .from("seasons")
    .insert({
      competition_id: form.competition_id,
      name: form.name.trim(),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: "draft",
      sets_to_win: setsToWin,
      scoring_type: scoringConfig.type,
      default_scoring_config: scoringConfig,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/center/competitions/${form.competition_id}`)
  return { id: data.id }
}

export async function updateSeason(
  seasonId: string,
  form: {
    name: string
    start_date?: string
    end_date?: string
    sets_to_win: number
    scoring_config: SeasonScoringConfig
  }
) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()

  // Verify season belongs to this center
  const { data: season } = await supabase
    .from("seasons")
    .select("id, competitions!inner(center_id)")
    .eq("id", seasonId)
    .single()

  if (!season || (season.competitions as any).center_id !== center.id) {
    return { error: "Brak dostępu." }
  }

  const { error } = await supabase
    .from("seasons")
    .update({
      name: form.name.trim(),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      sets_to_win: form.sets_to_win,
      scoring_type: form.scoring_config.type,
      default_scoring_config: form.scoring_config,
      updated_at: new Date().toISOString(),
    })
    .eq("id", seasonId)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/center/competitions")
  return {}
}

export async function activateSeason(seasonId: string) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("seasons")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", seasonId)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/center/competitions")
  return {}
}

// ---- leagues ----------------------------------------------------------------

export async function createLeague(form: {
  season_id: string
  name: string
  level: number
  round_robin_mode: "single" | "double"
  promotions?: number
  demotions?: number
}) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const supabase = await createClient()

  // Read season's match format and scoring config
  const { data: season } = await supabase
    .from("seasons")
    .select("sets_to_win, scoring_type, default_scoring_config")
    .eq("id", form.season_id)
    .single()

  const setsToWin = season?.sets_to_win ?? 3
  const seasonScoringConfig: SeasonScoringConfig = (season?.default_scoring_config as SeasonScoringConfig) ?? {
    type: "advanced",
    results: defaultAdvancedResults(setsToWin),
  }

  const matchFormat = { type: "race_to" as const, sets_to_win: setsToWin }
  const leagueScoringConfig = buildLeagueScoringConfig(setsToWin, seasonScoringConfig)

  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .insert({
      season_id: form.season_id,
      name: form.name.trim(),
      level: form.level,
      round_robin_mode: form.round_robin_mode,
      match_format: matchFormat,
      promotions: form.promotions ?? null,
      demotions: form.demotions ?? null,
    })
    .select("id")
    .single()

  if (leagueErr) return { error: leagueErr.message }

  // Create scoring config snapshot from season's config
  const { data: scoringConfig, error: scErr } = await supabase
    .from("scoring_configs")
    .insert({
      league_id: league.id,
      template_id: null,
      config: leagueScoringConfig,
    })
    .select("id")
    .single()

  if (scErr) return { error: scErr.message }

  await supabase
    .from("leagues")
    .update({ scoring_config_id: scoringConfig.id })
    .eq("id", league.id)

  revalidatePath("/dashboard/center/competitions")
  return { id: league.id }
}

export async function assignPlayerToLeague(leagueId: string, profileId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("league_players")
    .upsert({ league_id: leagueId, profile_id: profileId }, { onConflict: "league_id,profile_id" })

  if (error) return { error: error.message }
  revalidatePath("/dashboard/center/competitions")
  return {}
}

export async function removePlayerFromLeague(leagueId: string, profileId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("league_players")
    .delete()
    .eq("league_id", leagueId)
    .eq("profile_id", profileId)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/center/competitions")
  return {}
}

// ---- schedule generation ----------------------------------------------------

export async function generateSchedule(leagueId: string) {
  const supabase = await createClient()

  const { data: league } = await supabase
    .from("leagues")
    .select("*, league_players(profile_id), rounds(id)")
    .eq("id", leagueId)
    .single()

  if (!league) return { error: "Liga nie istnieje." }
  if ((league.rounds ?? []).length > 0) return { error: "Terminarz już wygenerowany." }

  const players: string[] = (league.league_players ?? []).map(
    (lp: { profile_id: string }) => lp.profile_id
  )
  if (players.length < 2) return { error: "Za mało zawodników (minimum 2)." }

  const scheduleMatches = generateRoundRobin(players, league.round_robin_mode)
  const maxRound = Math.max(...scheduleMatches.map((m) => m.round_number), 0)

  // Create rounds
  const roundsToInsert = Array.from({ length: maxRound }, (_, i) => ({
    league_id: leagueId,
    name: `Runda ${i + 1}`,
    number: i + 1,
  }))

  const { data: rounds, error: roundErr } = await supabase
    .from("rounds")
    .insert(roundsToInsert)
    .select("id, number")

  if (roundErr) return { error: roundErr.message }

  const roundMap = new Map(rounds.map((r: { id: string; number: number }) => [r.number, r.id]))

  // Create matches
  const matchesToInsert = scheduleMatches.map((m) => ({
    league_id: leagueId,
    round_id: roundMap.get(m.round_number),
    player_a_id: m.player_a_id,
    player_b_id: m.player_b_id,
    status: "scheduled",
  }))

  const { error: matchErr } = await supabase.from("matches").insert(matchesToInsert)
  if (matchErr) return { error: matchErr.message }

  revalidatePath("/dashboard/center/competitions")
  return { rounds: maxRound, matches: scheduleMatches.length }
}

// ---- invitations ------------------------------------------------------------

export async function createInvitationLink(competitionId: string) {
  const center = await getMyCenter()
  if (!center) return { error: "Brak centrum." }

  const code = nanoid(10)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("invitation_tokens")
    .insert({
      competition_id: competitionId,
      type: "link",
      code,
      created_by: center.userId,
    })
    .select("code")
    .single()

  if (error) return { error: error.message }
  return { code: data.code }
}

export async function getCompetitionInvitations(competitionId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("invitation_tokens")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: false })
  return data ?? []
}

// ---- competition players ----------------------------------------------------

export async function getCompetitionPlayers(competitionId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("competition_players")
    .select("*, players!inner(first_name, last_name, phone)")
    .eq("competition_id", competitionId)
    .order("invited_at", { ascending: false })
  return data ?? []
}

// ---- join by invitation code (player) ---------------------------------------

export async function joinCompetitionByCode(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nie jesteś zalogowany." }

  const { data: token } = await supabase
    .from("invitation_tokens")
    .select("id, competition_id, max_uses, use_count, expires_at")
    .eq("code", code)
    .single()

  if (!token) return { error: "Nieprawidłowy kod zaproszenia." }
  if (token.expires_at && new Date(token.expires_at) < new Date())
    return { error: "Link zaproszenia wygasł." }
  if (token.max_uses !== null && token.use_count >= token.max_uses)
    return { error: "Limit użyć linku wyczerpany." }

  const { data: existing } = await supabase
    .from("competition_players")
    .select("id")
    .eq("competition_id", token.competition_id)
    .eq("profile_id", user.id)
    .single()

  if (!existing) {
    const { error: insertErr } = await supabase.from("competition_players").insert({
      competition_id: token.competition_id,
      profile_id: user.id,
      invitation_status: "accepted",
      invited_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(),
    })
    if (insertErr) return { error: insertErr.message }
  } else {
    await supabase
      .from("competition_players")
      .update({ invitation_status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", existing.id)
  }

  // Increment use_count
  await supabase
    .from("invitation_tokens")
    .update({ use_count: (token.use_count ?? 0) + 1 })
    .eq("id", token.id)

  revalidatePath("/dashboard/player/leagues")
  return {}
}

// ---- helpers ----------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}
