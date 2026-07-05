"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { centerSubmitResult, centerSubmitWalkover } from "@/lib/actions/matches"
import type { ScoringConfig } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Pencil, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Squash scoring rules:
// - First to 11 wins, BUT must lead by 2
// - At 10:10 play continues until 2-point lead → exactly 12:10, 13:11, 14:12, etc.
// - 14:10 is IMPOSSIBLE (would have ended at 12:10)
function isSetComplete(a: number, b: number): boolean {
  const max = Math.max(a, b)
  const min = Math.min(a, b)
  if (max < 11) return false
  if (max === 11) return min <= 9   // standard win: 11:0–11:9
  return max - min === 2            // deuce extension: 12:10, 13:11, …
}

type SetStatus = "empty" | "partial" | "valid_a" | "valid_b" | "invalid"

function getSetStatus(a: string, b: string): SetStatus {
  if (a === "" && b === "") return "empty"
  if (a === "" || b === "") return "partial"
  const na = Number(a), nb = Number(b)
  if (!isSetComplete(na, nb)) return "invalid"
  return na > nb ? "valid_a" : "valid_b"
}

function getSetError(a: string, b: string): string | null {
  if (a === "" || b === "") return null
  const na = Number(a), nb = Number(b)
  if (isSetComplete(na, nb)) return null
  const max = Math.max(na, nb)
  const min = Math.min(na, nb)
  if (max < 11) return `min. 11 pkt (masz ${max})`
  if (max === 11 && min === 10) return `przy stanie 10:10 gra się do przewagi 2 (np. 12:10)`
  if (max > 11 && max - min !== 2) return `${na}:${nb} — niemożliwy wynik (dogrywka kończy się różnicą dokładnie 2, np. ${max}:${max - 2})`
  return `wynik niepoprawny`
}

function calcPoints(
  winsA: number,
  winsB: number,
  winner: "a" | "b" | null,
  config: ScoringConfig
): { pA: number; pB: number } | null {
  if (!winner) return null
  const aKey = `${winsA}:${winsB}`
  const bKey = `${winsB}:${winsA}`
  let pA = 0, pB = 0
  if (winner === "a") {
    pA = config.win_by_sets[aKey] ?? 0
    pB = config.loss_by_sets[bKey] ?? 0
  } else {
    pB = config.win_by_sets[bKey] ?? 0
    pA = config.loss_by_sets[aKey] ?? 0
  }
  if (config.set_point?.enabled) {
    pA += winsA * config.set_point.value
    pB += winsB * config.set_point.value
  }
  if (config.participation_point?.enabled) {
    pA += config.participation_point.value
    pB += config.participation_point.value
  }
  return { pA, pB }
}

interface Props {
  matchId: string
  playerAName: string
  playerBName: string
  playerAId: string
  playerBId: string
  setsToWin: number
  existingSets?: { set_number: number; points_a: number; points_b: number }[]
  currentStatus: string
  scoringConfig: ScoringConfig
  numCourts: number
}

export function EnterMatchResultDialog({
  matchId,
  playerAName,
  playerBName,
  playerAId,
  playerBId,
  setsToWin,
  existingSets,
  currentStatus,
  scoringConfig,
  numCourts,
}: Props) {
  const router = useRouter()

  // Start with setsToWin columns (minimum to determine winner), add dynamically
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"result" | "walkover">("result")
  const [valA, setValA] = useState<string[]>(() => Array(setsToWin).fill(""))
  const [valB, setValB] = useState<string[]>(() => Array(setsToWin).fill(""))
  const [numCols, setNumCols] = useState(setsToWin)
  const [matchDate, setMatchDate] = useState("")
  const [matchTime, setMatchTime] = useState("")
  const [courtNumber, setCourtNumber] = useState("")
  const [walkoverWinner, setWalkoverWinner] = useState<"a" | "b" | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const maxSets = setsToWin * 2 - 1

  // Per-set statuses
  const statuses: SetStatus[] = Array.from({ length: numCols }, (_, i) =>
    getSetStatus(valA[i] ?? "", valB[i] ?? "")
  )

  // Running match score — stop at deciding set
  let winsA = 0, winsB = 0, decidingCol = -1
  for (let i = 0; i < numCols; i++) {
    const s = statuses[i]
    if (s === "valid_a") winsA++
    else if (s === "valid_b") winsB++
    if (winsA >= setsToWin || winsB >= setsToWin) { decidingCol = i; break }
  }
  const matchWinner: "a" | "b" | null = winsA >= setsToWin ? "a" : winsB >= setsToWin ? "b" : null

  const setErrors: (string | null)[] = Array.from({ length: numCols }, (_, i) =>
    statuses[i] === "invalid" ? getSetError(valA[i] ?? "", valB[i] ?? "") : null
  )
  const anySetError = setErrors.some(Boolean)
  const points = calcPoints(winsA, winsB, matchWinner, scoringConfig)

  // Add column when last set is complete (valid result) but no winner yet
  useEffect(() => {
    if (numCols >= maxSets) return
    const lastIdx = numCols - 1
    const lastStatus = getSetStatus(valA[lastIdx] ?? "", valB[lastIdx] ?? "")
    if ((lastStatus === "valid_a" || lastStatus === "valid_b") && matchWinner === null) {
      setNumCols((n) => n + 1)
      setValA((prev) => [...prev, ""])
      setValB((prev) => [...prev, ""])
    }
  }, [valA, valB, numCols, matchWinner, maxSets])

  function handleOpen(v: boolean) {
    setOpen(v)
    if (!v) return

    const today = new Date().toISOString().split("T")[0]
    setMatchDate(today)
    setMatchTime("")
    setCourtNumber("")

    if (existingSets && existingSets.length > 0 && currentStatus === "finished") {
      const sorted = [...existingSets].sort((x, y) => x.set_number - y.set_number)
      const n = Math.max(setsToWin, sorted.length)
      const a = Array(n).fill(""), b = Array(n).fill("")
      sorted.forEach((s, i) => { a[i] = String(s.points_a); b[i] = String(s.points_b) })
      setValA(a); setValB(b); setNumCols(n)
      setMode("result")
    } else {
      setValA(Array(setsToWin).fill(""))
      setValB(Array(setsToWin).fill(""))
      setNumCols(setsToWin)
      setMode(currentStatus === "walkover" ? "walkover" : "result")
    }
    setWalkoverWinner(null)
    setSubmitError("")
  }

  function updateA(col: number, v: string) {
    setValA((prev) => { const n = [...prev]; n[col] = v.replace(/\D/g, ""); return n })
  }
  function updateB(col: number, v: string) {
    setValB((prev) => { const n = [...prev]; n[col] = v.replace(/\D/g, ""); return n })
  }

  async function handleSubmitResult() {
    const cutoff = decidingCol >= 0 ? decidingCol + 1 : numCols
    const toSubmit: { points_a: number; points_b: number }[] = []

    for (let i = 0; i < cutoff; i++) {
      const s = statuses[i]
      if (s === "invalid") { setSubmitError(`Set ${i + 1}: ${getSetError(valA[i] ?? "", valB[i] ?? "")}`); return }
      if (s === "empty" || s === "partial") { setSubmitError(`Set ${i + 1}: uzupełnij oba pola.`); return }
      toSubmit.push({ points_a: Number(valA[i]), points_b: Number(valB[i]) })
    }
    if (!matchWinner) { setSubmitError(`Brak zwycięzcy — wymagane ${setsToWin} wygranych setów.`); return }

    const playedAt = matchDate
      ? new Date(`${matchDate}${matchTime ? "T" + matchTime : "T12:00"}:00`).toISOString()
      : undefined
    const court = courtNumber ? Number(courtNumber) : undefined

    setSubmitting(true); setSubmitError("")
    const res = await centerSubmitResult(matchId, toSubmit, { played_at: playedAt, court_number: court })
    setSubmitting(false)
    if (res?.error) { setSubmitError(res.error); return }
    setOpen(false)
    router.refresh()
  }

  async function handleSubmitWalkover() {
    if (!walkoverWinner) { setSubmitError("Wybierz zwycięzcę walkovera."); return }
    const winnerId = walkoverWinner === "a" ? playerAId : playerBId
    setSubmitting(true); setSubmitError("")
    const res = await centerSubmitWalkover(matchId, winnerId)
    setSubmitting(false)
    if (res?.error) { setSubmitError(res.error); return }
    setOpen(false)
    router.refresh()
  }

  const hasResult = currentStatus === "finished" || currentStatus === "walkover"

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost" size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title={hasResult ? "Edytuj wynik" : "Wpisz wynik"}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-auto min-w-[28rem] max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="text-base">
            {playerAName} – {playerBName}
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button size="sm" variant={mode === "result" ? "default" : "outline"} className="flex-1"
            onClick={() => { setMode("result"); setSubmitError("") }}>
            Wynik meczu
          </Button>
          <Button size="sm" variant={mode === "walkover" ? "default" : "outline"} className="flex-1"
            onClick={() => { setMode("walkover"); setSubmitError("") }}>
            Walkover
          </Button>
        </div>

        {mode === "result" ? (
          <div className="space-y-4">

            {/* Match metadata */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Data</label>
                <Input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Godzina</label>
                <Input
                  type="time"
                  value={matchTime}
                  onChange={(e) => setMatchTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Kort</label>
                {numCourts > 1 ? (
                  <select
                    value={courtNumber}
                    onChange={(e) => setCourtNumber(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">—</option>
                    {Array.from({ length: numCourts }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={courtNumber}
                    onChange={(e) => setCourtNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="nr"
                    className="h-9 text-sm"
                  />
                )}
              </div>
            </div>

            <Separator />

            {/* Horizontal set table — starts with setsToWin cols, grows dynamically */}
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse w-full">
                <thead>
                  <tr>
                    <th className="text-left pr-3 pb-2 w-36" />
                    {Array.from({ length: numCols }, (_, i) => {
                      const afterDeciding = decidingCol >= 0 && i > decidingCol
                      const hasErr = statuses[i] === "invalid"
                      return (
                        <th key={i} className={cn(
                          "text-center pb-2 text-xs font-semibold",
                          hasErr ? "text-destructive"
                            : afterDeciding ? "text-muted-foreground/25"
                            : "text-muted-foreground"
                        )}>
                          Set {i + 1}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Player A */}
                  <tr>
                    <td className="pr-3 py-1 text-sm font-medium truncate w-36 align-middle">
                      {playerAName}
                    </td>
                    {Array.from({ length: numCols }, (_, i) => {
                      const s = statuses[i]
                      const afterDeciding = decidingCol >= 0 && i > decidingCol
                      return (
                        <td key={i} className="px-1 py-1">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={valA[i] ?? ""}
                            onChange={(e) => updateA(i, e.target.value)}
                            tabIndex={i * 2 + 1}
                            disabled={afterDeciding}
                            placeholder="–"
                            className={cn(
                              "h-10 w-full min-w-10 text-center tabular-nums px-1 text-base font-medium",
                              s === "valid_a" && "border-green-500 font-bold",
                              s === "valid_b" && "text-muted-foreground/50",
                              s === "invalid" && "border-destructive bg-destructive/5",
                              afterDeciding && "opacity-20 pointer-events-none"
                            )}
                          />
                        </td>
                      )
                    })}
                  </tr>

                  {/* Player B */}
                  <tr>
                    <td className="pr-3 py-1 text-sm font-medium truncate w-36 align-middle">
                      {playerBName}
                    </td>
                    {Array.from({ length: numCols }, (_, i) => {
                      const s = statuses[i]
                      const afterDeciding = decidingCol >= 0 && i > decidingCol
                      return (
                        <td key={i} className="px-1 py-1">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={valB[i] ?? ""}
                            onChange={(e) => updateB(i, e.target.value)}
                            tabIndex={i * 2 + 2}
                            disabled={afterDeciding}
                            placeholder="–"
                            className={cn(
                              "h-10 w-full min-w-10 text-center tabular-nums px-1 text-base font-medium",
                              s === "valid_b" && "border-green-500 font-bold",
                              s === "valid_a" && "text-muted-foreground/50",
                              s === "invalid" && "border-destructive bg-destructive/5",
                              afterDeciding && "opacity-20 pointer-events-none"
                            )}
                          />
                        </td>
                      )
                    })}
                  </tr>

                  {/* Error indicators under sets */}
                  {anySetError && (
                    <tr>
                      <td />
                      {Array.from({ length: numCols }, (_, i) => (
                        <td key={i} className="px-1 text-center pt-0.5">
                          {statuses[i] === "invalid" && (
                            <span className="text-[10px] font-bold text-destructive">!</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Per-set error messages */}
            {anySetError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 space-y-0.5">
                {setErrors.map((err, i) =>
                  err ? (
                    <p key={i} className="text-xs text-destructive">
                      <span className="font-semibold">Set {i + 1}:</span> {err}
                    </p>
                  ) : null
                )}
              </div>
            )}

            {/* Summary: match result + points */}
            {(winsA > 0 || winsB > 0) && (
              <div className="rounded-md border bg-muted/40 px-4 py-3 space-y-2">
                {/* Match score */}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-2xl font-bold tabular-nums leading-none",
                    matchWinner === "a" ? "text-foreground" : "text-muted-foreground"
                  )}>{winsA}</span>
                  <span className="text-lg text-muted-foreground font-medium">:</span>
                  <span className={cn(
                    "text-2xl font-bold tabular-nums leading-none",
                    matchWinner === "b" ? "text-foreground" : "text-muted-foreground"
                  )}>{winsB}</span>
                  {matchWinner && (
                    <span className="text-sm text-muted-foreground ml-1">
                      — wygrywa {matchWinner === "a" ? playerAName : playerBName}
                    </span>
                  )}
                </div>

                {/* Points breakdown */}
                {points && (
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground">{playerAName}</span>
                      {" "}+{points.pA} pkt
                    </span>
                    <span>
                      <span className="font-medium text-foreground">{playerBName}</span>
                      {" "}+{points.pB} pkt
                    </span>
                  </div>
                )}
              </div>
            )}

            {submitError && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleSubmitResult}
                disabled={submitting || matchWinner === null || anySetError}
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Zapisywanie...</>
                  : "Zapisz wynik"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
            </div>
          </div>
        ) : (
          /* Walkover */
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Który zawodnik wygrywa walkoverem?</p>
            <div className="space-y-2">
              {([["a", playerAName], ["b", playerBName]] as const).map(([side, name]) => (
                <label
                  key={side}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors",
                    walkoverWinner === side ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                  )}
                >
                  <input
                    type="radio"
                    name={`walkover-${matchId}`}
                    checked={walkoverWinner === side}
                    onChange={() => setWalkoverWinner(side)}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">{name}</span>
                </label>
              ))}
            </div>
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{submitError}</AlertDescription>
              </Alert>
            )}
            {walkoverWinner && (
              <div className="rounded-md border bg-muted/40 px-4 py-3 text-xs text-muted-foreground space-y-0.5">
                <p>
                  <span className="font-medium text-foreground">
                    {walkoverWinner === "a" ? playerAName : playerBName}
                  </span>
                  {" "}+{scoringConfig.walkover.winner} pkt
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    {walkoverWinner === "a" ? playerBName : playerAName}
                  </span>
                  {" "}+{scoringConfig.walkover.loser} pkt
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSubmitWalkover}
                disabled={submitting || walkoverWinner === null}>
                {submitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Zapisywanie...</>
                  : "Zapisz walkover"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
