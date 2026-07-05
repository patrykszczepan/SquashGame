"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { createSeason } from "@/lib/actions/competitions"
import { defaultAdvancedResults, type SeasonScoringConfig } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

type ScoringType = "simple" | "advanced"
type RoundRobinMode = "single" | "double"

const SETS_QUICK = [1, 2, 3, 4, 5]

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-border hover:bg-muted"
      }`}
    >
      {children}
    </button>
  )
}

export default function NewSeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [setsToWin, setSetsToWin] = useState(3)

  const [roundRobinMode, setRoundRobinMode] = useState<RoundRobinMode>("single")
  const [promotions, setPromotions] = useState(2)
  const [demotions, setDemotions] = useState(2)
  const [leagueCount, setLeagueCount] = useState(0)

  const [scoringType, setScoringType] = useState<ScoringType>("advanced")
  const [simpleWin, setSimpleWin] = useState(3)
  const [simpleLoss, setSimpleLoss] = useState(0)
  const [advancedResults, setAdvancedResults] = useState<Record<string, [number, number]>>(
    defaultAdvancedResults(3)
  )

  function handleSetsToWinChange(n: number) {
    setSetsToWin(n)
    setAdvancedResults(defaultAdvancedResults(n))
  }

  function setResultValue(key: string, side: 0 | 1, value: string) {
    const num = parseInt(value, 10)
    setAdvancedResults((prev) => ({
      ...prev,
      [key]: side === 0
        ? [isNaN(num) ? 0 : num, prev[key][1]]
        : [prev[key][0], isNaN(num) ? 0 : num],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Podaj nazwę sezonu."); return }
    setLoading(true)

    const scoringConfig: SeasonScoringConfig =
      scoringType === "simple"
        ? { type: "simple", win: simpleWin, loss: simpleLoss }
        : { type: "advanced", results: advancedResults }

    const result = await createSeason({
      competition_id: competitionId,
      name,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      sets_to_win: setsToWin,
      scoring_config: scoringConfig,
      default_round_robin_mode: roundRobinMode,
      default_promotions: promotions,
      default_demotions: demotions,
      league_count: leagueCount,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(`/dashboard/center/competitions/${competitionId}/seasons/${result.id}`)
  }

  const resultKeys = Array.from({ length: setsToWin }, (_, i) => `${setsToWin}:${i}`)
  const leaguePreview = leagueCount > 0
    ? Array.from({ length: Math.min(leagueCount, 5) }, (_, i) => `Liga ${i + 1}`)
    : []

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="text-sm text-muted-foreground mb-1">
          <Link href={`/dashboard/center/competitions/${competitionId}`} className="hover:underline">
            ← Rozgrywki
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Nowy sezon</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ustawienia dziedziczone przez wszystkie ligi — można nadpisać per liga.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Dane sezonu */}
        <Card>
          <CardHeader><CardTitle>Dane sezonu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa sezonu <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="np. Sezon 2 — lato 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data rozpoczęcia</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data zakończenia</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Format meczu */}
        <Card>
          <CardHeader>
            <CardTitle>Format meczu</CardTitle>
            <CardDescription>Do ilu zwycięskich gemów grany jest mecz.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 items-center">
              {SETS_QUICK.map((n) => (
                <ToggleButton key={n} active={setsToWin === n} onClick={() => handleSetsToWinChange(n)}>
                  {n}
                </ToggleButton>
              ))}
              <input
                type="number"
                min="1"
                max="99"
                value={setsToWin > 5 ? setsToWin : ""}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  if (!isNaN(n) && n >= 1) handleSetsToWinChange(n)
                }}
                placeholder="inny"
                className={`flex-1 py-2 px-2 rounded-md border text-sm text-center transition-colors ${
                  setsToWin > 5 ? "border-primary bg-primary/5" : "border-border bg-background"
                } focus:outline-none focus:ring-2 focus:ring-ring`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Mecz do <strong>{setsToWin}</strong> zwycięskich gemów — możliwe wyniki:{" "}
              <span className="font-mono">{resultKeys.join(", ")}</span> i odwrotne.
            </p>
          </CardContent>
        </Card>

        {/* Domyślne ustawienia lig */}
        <Card>
          <CardHeader>
            <CardTitle>Domyślne ustawienia lig</CardTitle>
            <CardDescription>Każda liga w sezonie dziedziczy te wartości — można zmienić per liga.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Każdy z każdym</Label>
              <div className="flex gap-2">
                <ToggleButton active={roundRobinMode === "single"} onClick={() => setRoundRobinMode("single")}>
                  × 1 (jeden raz)
                </ToggleButton>
                <ToggleButton active={roundRobinMode === "double"} onClick={() => setRoundRobinMode("double")}>
                  × 2 (rewanż)
                </ToggleButton>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promotions">Awanse (miejsc)</Label>
                <Input
                  id="promotions"
                  type="number"
                  min="0"
                  value={promotions}
                  onChange={(e) => setPromotions(parseInt(e.target.value, 10) || 0)}
                />
                <p className="text-xs text-muted-foreground">Ilu zawodników awansuje z ligi.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="demotions">Spadki (miejsc)</Label>
                <Input
                  id="demotions"
                  type="number"
                  min="0"
                  value={demotions}
                  onChange={(e) => setDemotions(parseInt(e.target.value, 10) || 0)}
                />
                <p className="text-xs text-muted-foreground">Ilu zawodników spada z ligi.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ligi w sezonie */}
        <Card>
          <CardHeader>
            <CardTitle>Generowanie lig</CardTitle>
            <CardDescription>
              Wpisz ile lig ma mieć sezon — zostaną stworzone automatycznie z powyższymi ustawieniami.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="0"
                max="20"
                value={leagueCount || ""}
                onChange={(e) => setLeagueCount(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">
                {leagueCount === 0
                  ? "Ligi dodasz ręcznie po utworzeniu sezonu."
                  : `Zostanie utworzone ${leagueCount} ${leagueCount === 1 ? "liga" : leagueCount < 5 ? "ligi" : "lig"}.`}
              </span>
            </div>
            {leaguePreview.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {leaguePreview.map((l) => (
                  <span key={l} className="text-xs bg-muted rounded-md px-2.5 py-1 font-medium">{l}</span>
                ))}
                {leagueCount > 5 && (
                  <span className="text-xs text-muted-foreground py-1">
                    + {leagueCount - 5} więcej...
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Punktacja */}
        <Card>
          <CardHeader>
            <CardTitle>Punktacja ligowa</CardTitle>
            <CardDescription>Ile punktów do tabeli zdobywa zawodnik za wynik meczu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {(["simple", "advanced"] as ScoringType[]).map((t) => (
                <ToggleButton key={t} active={scoringType === t} onClick={() => setScoringType(t)}>
                  {t === "simple" ? "Prosta" : "Zaawansowana"}
                </ToggleButton>
              ))}
            </div>

            {scoringType === "simple" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="simple_win">Wygrany (pkt)</Label>
                    <Input
                      id="simple_win"
                      type="number"
                      min="0"
                      value={simpleWin}
                      onChange={(e) => setSimpleWin(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="simple_loss">Przegrany (pkt)</Label>
                    <Input
                      id="simple_loss"
                      type="number"
                      min="0"
                      value={simpleLoss}
                      onChange={(e) => setSimpleLoss(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Każda wygrana daje {simpleWin} pkt niezależnie od liczby gemów.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Ustaw punkty dla każdego możliwego wyniku. Wyniki odwrotne (przegrane) tworzone automatycznie.
                </p>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-1/3" />
                      <col className="w-1/3" />
                      <col className="w-1/3" />
                    </colgroup>
                    <thead>
                      <tr className="bg-muted border-b">
                        <th className="py-3 text-center font-semibold text-foreground">Wynik</th>
                        <th className="py-3 text-center font-semibold text-foreground">Zwycięzca</th>
                        <th className="py-3 text-center font-semibold text-foreground">Przegrany</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {resultKeys.map((key) => {
                        const [winPts, lossPts] = advancedResults[key] ?? [0, 0]
                        return (
                          <tr key={key} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 text-center">
                              <span className="inline-flex items-center justify-center font-mono font-bold text-base bg-primary/10 text-primary rounded-md px-4 py-1 min-w-[4rem]">
                                {key}
                              </span>
                            </td>
                            <td className="py-2 text-center">
                              <Input
                                type="number"
                                min="0"
                                value={winPts}
                                onChange={(e) => setResultValue(key, 0, e.target.value)}
                                className="text-center h-9 w-24 mx-auto"
                              />
                            </td>
                            <td className="py-2 text-center">
                              <Input
                                type="number"
                                min="0"
                                value={lossPts}
                                onChange={(e) => setResultValue(key, 1, e.target.value)}
                                className="text-center h-9 w-24 mx-auto"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Im trudniejsza wygrana, tym mniej punktów — premiuje walkę o każdego gema.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 pb-6">
          <Button type="submit" disabled={loading}>
            {loading
              ? "Tworzenie..."
              : leagueCount > 0
              ? `Utwórz sezon i ${leagueCount} ${leagueCount === 1 ? "ligę" : leagueCount < 5 ? "ligi" : "lig"}`
              : "Utwórz sezon"}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/center/competitions/${competitionId}`}>Anuluj</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
