export interface BracketSlot {
  round: number
  position: number
  playerId: string | null
  isBye: boolean
}

export interface BracketMatch {
  round: number
  position_a: number
  position_b: number
}

export interface BracketPlan {
  slots: BracketSlot[]
  matches: BracketMatch[]
  rounds: number
  bracketSize: number
}

export function planSingleElimination(playerIds: string[]): BracketPlan {
  const n = playerIds.length
  if (n < 2) throw new Error("Potrzeba co najmniej 2 zawodników.")

  const rounds = Math.ceil(Math.log2(n))
  const bracketSize = Math.pow(2, rounds)

  // Seed players consecutively; fill remaining with byes
  const seeds: Array<string | null> = [
    ...playerIds,
    ...Array(bracketSize - n).fill(null),
  ]

  const slots: BracketSlot[] = []
  const matches: BracketMatch[] = []

  // Round 1 slots
  for (let pos = 1; pos <= bracketSize; pos++) {
    const playerId = seeds[pos - 1]
    slots.push({
      round: 1,
      position: pos,
      playerId: playerId ?? null,
      isBye: playerId === null,
    })
  }

  // Round 1 match pairs: (1,2), (3,4), ...
  for (let i = 0; i < bracketSize / 2; i++) {
    const posA = 2 * i + 1
    const posB = 2 * i + 2
    const slotA = slots.find((s) => s.round === 1 && s.position === posA)!
    const slotB = slots.find((s) => s.round === 1 && s.position === posB)!

    if (!slotA.isBye && !slotB.isBye) {
      matches.push({ round: 1, position_a: posA, position_b: posB })
    }
  }

  // Create empty slots for rounds 2..rounds
  for (let r = 2; r <= rounds; r++) {
    const slotsInRound = Math.pow(2, rounds - r)
    for (let pos = 1; pos <= slotsInRound * 2; pos++) {
      slots.push({ round: r, position: pos, playerId: null, isBye: false })
    }
  }

  return { slots, matches, rounds, bracketSize }
}

/** Next round slot position for a winner at (round, position) */
export function nextRoundPosition(position: number): number {
  return Math.ceil(position / 2)
}

/** The partner slot in the same round (for creating the next match) */
export function partnerPosition(position: number): number {
  return position % 2 === 1 ? position + 1 : position - 1
}
