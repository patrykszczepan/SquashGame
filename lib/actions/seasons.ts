"use server"

import { createClient } from "@/lib/supabase/server"
import { calculateTable } from "@/lib/scoring/engine"
import type { ScoringConfig, Match } from "@/lib/types"
import { revalidatePath } from "next/cache"

export async function closeSeason(seasonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Brak autoryzacji." }

  // Verify ownership
  const { data: season } = await supabase
    .from("seasons")
    .select("id, status, competition_id, competitions!inner(center_id)")
    .eq("id", seasonId)
    .single()

  if (!season) return { error: "Sezon nie istnieje." }
  if (season.status !== "active") return { error: "Można zamknąć tylko aktywny sezon." }

  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!center) return { error: "Brak centrum." }

  const comp = season.competitions as any
  if (comp.center_id !== center.id) return { error: "Brak dostępu." }

  // Fetch all leagues with players and matches
  const { data: leagues } = await supabase
    .from("leagues")
    .select(`
      id, promotions, demotions, scoring_config_id,
      scoring_configs(config),
      league_players(id, profile_id, players(first_name, last_name)),
      rounds(matches(id, player_a_id, player_b_id, status, winner_id, walkover_for_id, match_sets(set_number, points_a, points_b)))
    `)
    .eq("season_id", seasonId)

  for (const league of (leagues ?? []) as any[]) {
    const scoringConfig: ScoringConfig =
      league.scoring_configs?.config ?? {
        win_by_sets: { "3:0": 5, "3:1": 4, "3:2": 3 },
        loss_by_sets: { "0:3": 0, "1:3": 1, "2:3": 2 },
        set_point: { enabled: false, value: 0 },
        participation_point: { enabled: false, value: 0 },
        walkover: { winner: 5, loser: 0 },
        not_played: { a: 0, b: 0 },
        tiebreaker: ["points", "head_to_head", "set_ratio", "small_points", "matches_played"],
      }

    const lp = (league.league_players ?? []) as any[]
    const playerRefs = lp.map((p: any) => ({
      id: p.profile_id,
      name: `${p.players?.first_name ?? ""} ${p.players?.last_name ?? ""}`.trim(),
    }))

    const allMatches: Match[] = (league.rounds ?? []).flatMap(
      (r: any) => r.matches ?? []
    )
    const table = calculateTable(playerRefs, allMatches, scoringConfig)

    const promotions = league.promotions ?? 0
    const demotions = league.demotions ?? 0

    for (let i = 0; i < table.length; i++) {
      const row = table[i]
      let status: string
      if (promotions > 0 && i < promotions) status = "promoted"
      else if (demotions > 0 && i >= table.length - demotions) status = "demoted"
      else status = "stayed"

      await supabase
        .from("league_players")
        .update({ promotion_status: status, position: i + 1 })
        .eq("league_id", league.id)
        .eq("profile_id", row.profile_id)
    }
  }

  // Mark season as finished
  const { error } = await supabase
    .from("seasons")
    .update({ status: "finished", updated_at: new Date().toISOString() })
    .eq("id", seasonId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/center/competitions`)
  return {}
}
