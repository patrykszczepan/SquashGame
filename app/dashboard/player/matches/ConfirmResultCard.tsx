"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { confirmMatchResult, disputeMatchResult } from "@/lib/actions/matches"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"

interface Props {
  match: any
  currentUserId: string
  nameMap: Record<string, string>
}

export function ConfirmResultCard({ match, currentUserId, nameMap }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<"confirm" | "dispute" | null>(null)
  const [error, setError] = useState("")

  const opponentId =
    match.player_a_id === currentUserId ? match.player_b_id : match.player_a_id
  const opName = nameMap[opponentId] ?? "Rywal"
  const isPlayerA = match.player_a_id === currentUserId

  const setsWonA = (match.match_sets ?? []).filter(
    (s: any) => s.points_a > s.points_b
  ).length
  const setsWonB = (match.match_sets ?? []).filter(
    (s: any) => s.points_b > s.points_a
  ).length

  const autoConfirmAt = match.auto_confirm_at
    ? new Date(match.auto_confirm_at).toLocaleDateString("pl")
    : null

  async function handleConfirm() {
    setLoading("confirm")
    const res = await confirmMatchResult(match.id)
    if (res.error) { setError(res.error); setLoading(null) }
    else router.refresh()
  }

  async function handleDispute() {
    setLoading("dispute")
    const res = await disputeMatchResult(match.id)
    if (res.error) { setError(res.error); setLoading(null) }
    else router.refresh()
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">vs {opName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {match.leagues?.name} · {match.rounds?.name}
            </p>
          </div>
          <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
            Czeka na Ciebie
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score display */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Wynik zaproponowany przez rywala:</p>
          <div className="font-bold text-lg">
            {isPlayerA ? setsWonA : setsWonB}:{isPlayerA ? setsWonB : setsWonA}
          </div>
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            {(match.match_sets ?? []).map((s: any, i: number) => (
              <span key={i} className="mx-1">
                {isPlayerA ? s.points_a : s.points_b}–{isPlayerA ? s.points_b : s.points_a}
              </span>
            ))}
          </div>
        </div>
        {autoConfirmAt && (
          <p className="text-xs text-center text-muted-foreground">
            Auto-zatwierdzenie: {autoConfirmAt}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={handleConfirm}
            disabled={!!loading}
          >
            <Check className="h-4 w-4 mr-1" />
            {loading === "confirm" ? "..." : "Potwierdź"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDispute}
            disabled={!!loading}
          >
            <X className="h-4 w-4 mr-1" />
            {loading === "dispute" ? "..." : "Zakwestionuj"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
