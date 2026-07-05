import type { SupabaseClient } from "@supabase/supabase-js"

export interface PlayerStats {
  played: number
  won: number
  lost: number
  sets_won: number
  sets_lost: number
  points_won: number
  points_lost: number
  form: ("W" | "L")[]
}

export async function getPlayerStats(
  profileId: string,
  supabase: SupabaseClient
): Promise<PlayerStats> {
  const { data: matches } = await supabase
    .from("matches")
    .select("id, player_a_id, player_b_id, winner_id, status, match_sets(points_a, points_b)")
    .or(`player_a_id.eq.${profileId},player_b_id.eq.${profileId}`)
    .in("status", ["finished", "walkover"])
    .order("created_at", { ascending: false })

  const all = (matches ?? []) as any[]

  let played = 0, won = 0, lost = 0
  let sets_won = 0, sets_lost = 0
  let points_won = 0, points_lost = 0
  const form: ("W" | "L")[] = []

  for (const m of all) {
    if (m.status === "walkover") {
      played++
      if (m.winner_id === profileId) {
        won++
        if (form.length < 5) form.push("W")
      } else {
        lost++
        if (form.length < 5) form.push("L")
      }
      continue
    }

    const isA = m.player_a_id === profileId
    const sets = (m.match_sets ?? []) as any[]
    let mySets = 0, oppSets = 0
    let myPts = 0, oppPts = 0
    for (const s of sets) {
      if (isA) {
        if (s.points_a > s.points_b) mySets++
        else oppSets++
        myPts += s.points_a
        oppPts += s.points_b
      } else {
        if (s.points_b > s.points_a) mySets++
        else oppSets++
        myPts += s.points_b
        oppPts += s.points_a
      }
    }
    played++
    sets_won += mySets
    sets_lost += oppSets
    points_won += myPts
    points_lost += oppPts
    if (m.winner_id === profileId) {
      won++
      if (form.length < 5) form.push("W")
    } else {
      lost++
      if (form.length < 5) form.push("L")
    }
  }

  return { played, won, lost, sets_won, sets_lost, points_won, points_lost, form }
}
