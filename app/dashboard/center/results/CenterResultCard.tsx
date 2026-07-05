"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { centerSubmitResult } from "@/lib/actions/matches"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp } from "lucide-react"

interface Props {
  match: any
  nameMap: Record<string, string>
}

export function CenterResultCard({ match, nameMap }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const format = match.leagues?.match_format ?? { type: "best_of", sets: 5 }
  const totalSets = format.sets ?? 5
  const winsNeeded = Math.ceil(totalSets / 2)
  const maxSets = totalSets

  const [sets, setSets] = useState<Array<{ points_a: string; points_b: string }>>(
    Array.from({ length: maxSets }, () => ({ points_a: "", points_b: "" }))
  )

  const nameA = nameMap[match.player_a_id] ?? "Zawodnik A"
  const nameB = nameMap[match.player_b_id] ?? "Zawodnik B"

  const league = match.leagues
  const season = league?.seasons
  const competition = season?.competitions

  function setScore(idx: number, side: "a" | "b", val: string) {
    setSets((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [`points_${side}`]: val }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const filledSets = sets
      .map((s) => ({
        points_a: parseInt(s.points_a, 10),
        points_b: parseInt(s.points_b, 10),
      }))
      .filter((s) => !isNaN(s.points_a) && !isNaN(s.points_b))

    if (filledSets.length < winsNeeded) {
      setError(`Wpisz wyniki co najmniej ${winsNeeded} setów.`)
      return
    }

    setLoading(true)
    const result = await centerSubmitResult(match.id, filledSets)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  const statusLabel =
    match.status === "pending_confirmation"
      ? "Oczekuje"
      : match.status === "postponed"
      ? "Odłożony"
      : "Zaplanowany"

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm font-medium">
              {nameA} vs {nameB}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {competition?.name} · {season?.name} · {league?.name} · {match.rounds?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{statusLabel}</Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {open ? "Zwiń" : "Wpisz"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm font-medium text-center">
              <span>{nameA}</span>
              <span className="text-muted-foreground">vs</span>
              <span>{nameB}</span>
            </div>
            {sets.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                <Input
                  type="number"
                  min="0"
                  max="99"
                  placeholder="pkt"
                  value={s.points_a}
                  onChange={(e) => setScore(i, "a", e.target.value)}
                  className="text-center"
                />
                <span className="text-muted-foreground text-xs">Set {i + 1}</span>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  placeholder="pkt"
                  value={s.points_b}
                  onChange={(e) => setScore(i, "b", e.target.value)}
                  className="text-center"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Zostaw puste sety, których nie rozegrano.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="sm" disabled={loading} className="w-full">
              {loading ? "Zapisywanie..." : "Zatwierdź wynik (kartka)"}
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  )
}
