"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitTournamentResult } from "@/lib/actions/tournaments"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Slot {
  id: string
  round: number
  position: number
  profile_id: string | null
  is_bye: boolean
  match_id: string | null
}

interface Props {
  tournamentId: string
  slots: Slot[]
  nameMap: Record<string, string>
  status: string
}

export function BracketView({ slots, nameMap, status }: Props) {
  const router = useRouter()
  const [openMatch, setOpenMatch] = useState<string | null>(null)
  const [sets, setSets] = useState([
    { points_a: "", points_b: "" },
    { points_a: "", points_b: "" },
    { points_a: "", points_b: "" },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const maxRound = Math.max(...slots.map((s) => s.round))

  function getName(profileId: string | null) {
    if (!profileId) return "TBD"
    return nameMap[profileId] ?? "?"
  }

  // Group slots by round
  const rounds: Record<number, Slot[]> = {}
  for (const s of slots) {
    if (!rounds[s.round]) rounds[s.round] = []
    rounds[s.round].push(s)
  }

  // Build match pairs: for each round, pair consecutive slots
  function getMatchPairs(roundSlots: Slot[]) {
    const sorted = [...roundSlots].sort((a, b) => a.position - b.position)
    const pairs: Array<{ a: Slot; b: Slot; matchId: string | null }> = []
    for (let i = 0; i < sorted.length; i += 2) {
      if (sorted[i + 1]) {
        pairs.push({
          a: sorted[i],
          b: sorted[i + 1],
          matchId: sorted[i].match_id ?? sorted[i + 1].match_id ?? null,
        })
      }
    }
    return pairs
  }

  async function handleSubmit(matchId: string) {
    const filled = sets
      .map((s) => ({
        points_a: parseInt(s.points_a, 10),
        points_b: parseInt(s.points_b, 10),
      }))
      .filter((s) => !isNaN(s.points_a) && !isNaN(s.points_b))

    if (filled.length < 2) {
      setError("Wpisz wyniki co najmniej 2 setów.")
      return
    }
    setLoading(true)
    const res = await submitTournamentResult(matchId, filled)
    if (res.error) {
      setError(res.error)
      setLoading(false)
    } else {
      setOpenMatch(null)
      setSets([
        { points_a: "", points_b: "" },
        { points_a: "", points_b: "" },
        { points_a: "", points_b: "" },
      ])
      router.refresh()
    }
  }

  const roundLabel: Record<number, string> = {}
  if (maxRound >= 1) roundLabel[maxRound] = "Finał"
  if (maxRound >= 2) roundLabel[maxRound - 1] = "Półfinał"
  if (maxRound >= 3) roundLabel[maxRound - 2] = "Ćwierćfinał"

  return (
    <div className="space-y-6">
      {Array.from({ length: maxRound }, (_, i) => i + 1).map((r) => {
        const pairs = getMatchPairs(rounds[r] ?? [])
        return (
          <div key={r}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              {roundLabel[r] ?? `Runda ${r}`}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pairs.map((pair, idx) => {
                const hasPlayers = pair.a.profile_id && pair.b.profile_id
                const isOpen = openMatch === pair.matchId

                return (
                  <Card
                    key={idx}
                    className={pair.matchId && hasPlayers && status === "active" ? "border-primary/30" : ""}
                  >
                    <CardContent className="py-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={pair.a.is_bye ? "text-muted-foreground italic" : "font-medium"}>
                          {pair.a.is_bye ? "— bye —" : getName(pair.a.profile_id)}
                        </span>
                      </div>
                      <div className="border-t" />
                      <div className="flex items-center justify-between text-sm">
                        <span className={pair.b.is_bye ? "text-muted-foreground italic" : "font-medium"}>
                          {pair.b.is_bye ? "— bye —" : getName(pair.b.profile_id)}
                        </span>
                      </div>
                      {pair.matchId && hasPlayers && status === "active" && !isOpen && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setOpenMatch(pair.matchId)
                            setError("")
                          }}
                        >
                          Wpisz wynik
                        </Button>
                      )}
                      {isOpen && pair.matchId && (
                        <div className="space-y-2 pt-1">
                          {sets.map((s, i) => (
                            <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-1 items-center">
                              <Input
                                type="number"
                                min="0"
                                max="99"
                                placeholder="A"
                                value={s.points_a}
                                onChange={(e) =>
                                  setSets((prev) => {
                                    const n = [...prev]
                                    n[i] = { ...n[i], points_a: e.target.value }
                                    return n
                                  })
                                }
                                className="text-center text-xs h-7"
                              />
                              <span className="text-xs text-muted-foreground">{i + 1}</span>
                              <Input
                                type="number"
                                min="0"
                                max="99"
                                placeholder="B"
                                value={s.points_b}
                                onChange={(e) =>
                                  setSets((prev) => {
                                    const n = [...prev]
                                    n[i] = { ...n[i], points_b: e.target.value }
                                    return n
                                  })
                                }
                                className="text-center text-xs h-7"
                              />
                            </div>
                          ))}
                          {error && <p className="text-xs text-destructive">{error}</p>}
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="flex-1"
                              disabled={loading}
                              onClick={() => handleSubmit(pair.matchId!)}
                            >
                              {loading ? "..." : "Zapisz"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setOpenMatch(null)}
                            >
                              Anuluj
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
      {status === "finished" && (
        <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="py-6 text-center">
            <p className="font-semibold text-yellow-700 dark:text-yellow-400">
              🏆 Turniej zakończony
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
