"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitMatchResult } from "@/lib/actions/matches"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp } from "lucide-react"

interface Props {
  match: any
  currentUserId: string
  nameMap: Record<string, string>
}

export function SubmitResultCard({ match, currentUserId, nameMap }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const format = match.leagues?.match_format ?? { type: "race_to", sets_to_win: 3 }
  const winsNeeded: number = format.sets_to_win ?? Math.ceil((format.sets ?? 5) / 2)
  const maxSets = winsNeeded * 2 - 1

  const [sets, setSets] = useState<Array<{ points_a: string; points_b: string }>>(
    Array.from({ length: maxSets }, () => ({ points_a: "", points_b: "" }))
  )

  const opponentId = match.player_a_id === currentUserId ? match.player_b_id : match.player_a_id
  const myName = nameMap[currentUserId] ?? "Ja"
  const opName = nameMap[opponentId] ?? "Rywal"

  const isPlayerA = match.player_a_id === currentUserId

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
    const result = await submitMatchResult(match.id, filledSets)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">
              {isPlayerA ? myName : opName} vs {isPlayerA ? opName : myName}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {match.leagues?.name} · {match.rounds?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Do zagrania</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {open ? "Zwiń" : "Wpisz wynik"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm">
              <span className="font-medium text-center">
                {isPlayerA ? myName : opName}
              </span>
              <span className="text-muted-foreground">vs</span>
              <span className="font-medium text-center">
                {isPlayerA ? opName : myName}
              </span>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="sm" disabled={loading} className="w-full">
              {loading ? "Wysyłanie..." : "Wyślij wynik do potwierdzenia"}
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  )
}
