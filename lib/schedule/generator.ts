export interface ScheduleMatch {
  player_a_id: string
  player_b_id: string
  round_number: number
}

// Classic circle (round-robin) algorithm
export function generateRoundRobin(
  playerIds: string[],
  mode: "single" | "double" = "single"
): ScheduleMatch[] {
  if (playerIds.length < 2) return []

  const players = [...playerIds]
  const hasBye = players.length % 2 === 1
  if (hasBye) players.push("__bye__")

  const n = players.length
  const numRounds = n - 1
  const perRound = n / 2
  const fixed = players[0]
  const rotating = players.slice(1)
  const matches: ScheduleMatch[] = []

  for (let round = 0; round < numRounds; round++) {
    const circle = [fixed, ...rotating]

    for (let i = 0; i < perRound; i++) {
      const a = circle[i]
      const b = circle[n - 1 - i]
      if (a !== "__bye__" && b !== "__bye__") {
        matches.push({ player_a_id: a, player_b_id: b, round_number: round + 1 })
        if (mode === "double") {
          matches.push({ player_a_id: b, player_b_id: a, round_number: numRounds + round + 1 })
        }
      }
    }

    // Rotate right: last element goes to position 1
    rotating.unshift(rotating.pop()!)
  }

  return matches
}

export function roundCount(playerCount: number, mode: "single" | "double"): number {
  const n = playerCount % 2 === 0 ? playerCount : playerCount + 1
  return mode === "double" ? (n - 1) * 2 : n - 1
}
