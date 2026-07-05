export interface ScheduleMatch {
  player_a_id: string
  player_b_id: string
  round_number: number
}

/**
 * Generates schedule matches grouped as legs (phases), not mathematical rounds.
 *
 * single: 1 round containing all unique pairs
 * double: 2 rounds — round 1 is the first leg, round 2 is the return leg
 *
 * Example: 4 players, double → 2 rounds × 6 matches each = 12 total
 */
export function generateRoundRobin(
  playerIds: string[],
  mode: "single" | "double" = "single"
): ScheduleMatch[] {
  if (playerIds.length < 2) return []

  const matches: ScheduleMatch[] = []

  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      matches.push({ player_a_id: playerIds[i], player_b_id: playerIds[j], round_number: 1 })
      if (mode === "double") {
        matches.push({ player_a_id: playerIds[j], player_b_id: playerIds[i], round_number: 2 })
      }
    }
  }

  return matches
}

export function roundCount(playerCount: number, mode: "single" | "double"): number {
  return mode === "double" ? 2 : 1
}
