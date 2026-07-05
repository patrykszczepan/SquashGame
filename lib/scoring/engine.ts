import type { Match, ScoringConfig, TableRow, TiebreakerCriterion } from "@/lib/types"

interface PlayerRef {
  id: string
  name: string
}

export function calculateTable(
  players: PlayerRef[],
  matches: Match[],
  config: ScoringConfig
): TableRow[] {
  const rows = new Map<string, TableRow>()

  for (const p of players) {
    rows.set(p.id, {
      profile_id: p.id,
      player_name: p.name,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      sets_won: 0,
      sets_lost: 0,
      small_points_won: 0,
      small_points_lost: 0,
    })
  }

  for (const match of matches) {
    if (match.status === "finished") processFinished(match, rows, config)
    else if (match.status === "walkover") processWalkover(match, rows, config)
    else if (match.status === "not_played") processNotPlayed(match, rows, config)
  }

  return sortTable(Array.from(rows.values()), matches, config.tiebreaker)
}

function processFinished(match: Match, rows: Map<string, TableRow>, config: ScoringConfig) {
  const sets = match.match_sets ?? []
  if (sets.length === 0) return

  let setsA = 0,
    setsB = 0,
    smallA = 0,
    smallB = 0

  for (const s of sets) {
    if (s.points_a > s.points_b) setsA++
    else setsB++
    smallA += s.points_a
    smallB += s.points_b
  }

  const rowA = rows.get(match.player_a_id)
  const rowB = rows.get(match.player_b_id)
  if (!rowA || !rowB) return

  rowA.played++
  rowB.played++
  rowA.sets_won += setsA
  rowA.sets_lost += setsB
  rowB.sets_won += setsB
  rowB.sets_lost += setsA
  rowA.small_points_won += smallA
  rowA.small_points_lost += smallB
  rowB.small_points_won += smallB
  rowB.small_points_lost += smallA

  if (config.participation_point.enabled) {
    rowA.points += config.participation_point.value
    rowB.points += config.participation_point.value
  }

  const winScore = `${Math.max(setsA, setsB)}:${Math.min(setsA, setsB)}`
  const lossScore = `${Math.min(setsA, setsB)}:${Math.max(setsA, setsB)}`

  if (setsA > setsB) {
    rowA.won++
    rowB.lost++
    rowA.points += config.win_by_sets[`${setsA}:${setsB}`] ?? config.win_by_sets[winScore] ?? 0
    rowB.points += config.loss_by_sets[`${setsB}:${setsA}`] ?? config.loss_by_sets[lossScore] ?? 0
  } else {
    rowB.won++
    rowA.lost++
    rowB.points += config.win_by_sets[`${setsB}:${setsA}`] ?? config.win_by_sets[winScore] ?? 0
    rowA.points += config.loss_by_sets[`${setsA}:${setsB}`] ?? config.loss_by_sets[lossScore] ?? 0
  }

  if (config.set_point.enabled) {
    rowA.points += setsA * config.set_point.value
    rowB.points += setsB * config.set_point.value
  }
}

function processWalkover(match: Match, rows: Map<string, TableRow>, config: ScoringConfig) {
  const winnerId = match.walkover_for_id ?? match.winner_id
  if (!winnerId) return
  const loserId =
    winnerId === match.player_a_id ? match.player_b_id : match.player_a_id

  const winner = rows.get(winnerId)
  const loser = rows.get(loserId)
  if (!winner || !loser) return

  winner.played++
  loser.played++
  winner.won++
  loser.lost++
  winner.points += config.walkover.winner
  loser.points += config.walkover.loser
}

function processNotPlayed(match: Match, rows: Map<string, TableRow>, config: ScoringConfig) {
  const rowA = rows.get(match.player_a_id)
  const rowB = rows.get(match.player_b_id)
  if (!rowA || !rowB) return
  rowA.points += config.not_played.a
  rowB.points += config.not_played.b
}

function sortTable(
  table: TableRow[],
  matches: Match[],
  tiebreaker: TiebreakerCriterion[]
): TableRow[] {
  return [...table].sort((a, b) => {
    for (const criterion of tiebreaker) {
      const diff = applyTiebreaker(a, b, criterion, matches)
      if (diff !== 0) return diff
    }
    return a.player_name.localeCompare(b.player_name, "pl")
  })
}

function applyTiebreaker(
  a: TableRow,
  b: TableRow,
  criterion: TiebreakerCriterion,
  matches: Match[]
): number {
  switch (criterion) {
    case "points":
      return b.points - a.points

    case "head_to_head": {
      const h2h = matches.filter(
        (m) =>
          m.status === "finished" &&
          ((m.player_a_id === a.profile_id && m.player_b_id === b.profile_id) ||
            (m.player_a_id === b.profile_id && m.player_b_id === a.profile_id))
      )
      if (h2h.length === 0) return 0
      let winsA = 0,
        winsB = 0
      for (const m of h2h) {
        if (m.winner_id === a.profile_id) winsA++
        else if (m.winner_id === b.profile_id) winsB++
      }
      return winsB - winsA
    }

    case "set_ratio": {
      const rA = a.sets_lost === 0 ? a.sets_won : a.sets_won / a.sets_lost
      const rB = b.sets_lost === 0 ? b.sets_won : b.sets_won / b.sets_lost
      return rB - rA
    }

    case "small_points": {
      const rA = a.small_points_lost === 0 ? a.small_points_won : a.small_points_won / a.small_points_lost
      const rB = b.small_points_lost === 0 ? b.small_points_won : b.small_points_won / b.small_points_lost
      return rB - rA
    }

    case "matches_played":
      return b.played - a.played

    default:
      return 0
  }
}

export function winsNeeded(matchFormat: { sets: number }): number {
  return Math.ceil(matchFormat.sets / 2)
}
