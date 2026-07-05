"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateSeason } from "@/lib/actions/competitions"
import { defaultAdvancedResults, type SeasonScoringConfig } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

type ScoringType = "simple" | "advanced"
const SETS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

interface Props {
  competitionId: string
  competitionName: string
  season: {
    id: string
    name: string
    status: string
    start_date: string | null
    end_date: string | null
    sets_to_win: number
    scoring_type: string
    default_scoring_config: SeasonScoringConfig | null
  }
}

function initAdvancedResults(
  setsToWin: number,
  config: SeasonScoringConfig | null
): Record<string, [number, number]> {
  if (config?.type === "advanced" && config.results) {
    // Check if results match current setsToWin
    const firstKey = Object.keys(config.results)[0]
    if (firstKey && parseInt(firstKey.split(":")[0], 10) === setsToWin) {
      return config.results
    }
  }
  return defaultAdvancedResults(setsToWin)
}

export function EditSeasonForm({ competitionId, competitionName, season }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState(season.name)
  const [startDate, setStartDate] = useState(season.start_date ?? "")
  const [endDate, setEndDate] = useState(season.end_date ?? "")
  const [setsToWin, setSetsToWin] = useState(season.sets_to_win ?? 3)
  const [scoringType, setScoringType] = useState<ScoringType>(
    (season.scoring_type as ScoringType) ?? "advanced"
  )
  const [simpleWin, setSimpleWin] = useState(
    season.default_scoring_config?.type === "simple"
      ? season.default_scoring_config.win
      : 3
  )
  const [simpleLoss, setSimpleLoss] = useState(
    season.default_scoring_config?.type === "simple"
      ? season.default_scoring_config.loss
      : 0
  )
  const [advancedResults, setAdvancedResults] = useState<Record<string, [number, number]>>(
    initAdvancedResults(season.sets_to_win ?? 3, season.default_scoring_config)
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
    setError("")
    setSuccess(false)

    const scoringConfig: SeasonScoringConfig =
      scoringType === "simple"
        ? { type: "simple", win: simpleWin, loss: simpleLoss }
        : { type: "advanced", results: advancedResults }

    const result = await updateSeason(season.id, {
      name,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      sets_to_win: setsToWin,
      scoring_config: scoringConfig,
    })

    setLoading(false)
    if (result.error) { setError(result.error); return }
    setSuccess(true)
    router.refresh()
  }

  const resultKeys = Array.from({ length: setsToWin }, (_, i) => `${setsToWin}:${i}`)
  const readonly = season.status === "finished"

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/dashboard/center/competitions" className="hover:underline">Rozgrywki</Link>
          <span>/</span>
          <Link href={`/dashboard/center/competitions/${competitionId}`} className="hover:underline">
            {competitionName}
          </Link>
          <span>/</span>
          <Link
            href={`/dashboard/center/competitions/${competitionId}/seasons/${season.id}`}
            className="hover:underline"
          >
            {season.name}
          </Link>
          <span>/</span>
          <span>Edytuj</span>
        </div>
        <h1 className="text-2xl font-bold">Edytuj sezon</h1>
        {readonly && (
          <p className="text-sm text-muted-foreground mt-1">
            Sezon zakończony — edycja zablokowana.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>Zapisano zmiany.</AlertDescription>
          </Alert>
        )}

        {/* Dane sezonu */}
        <Card>
          <CardHeader>
            <CardTitle>Dane sezonu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa sezonu <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={readonly}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data rozpoczęcia</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={readonly}
                />
              </div>
              <div className="space-y-2">
                <Label>Data zakończenia</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={readonly}
                />
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
            <div className="flex gap-2">
              {SETS_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => !readonly && handleSetsToWinChange(n)}
                  disabled={readonly}
                  className={`px-6 py-2 rounded-md border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    setsToWin === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  Do {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Możliwe wyniki: <span className="font-mono">{resultKeys.join(", ")}</span> i odwrotne.
            </p>
            {season.status === "active" && (
              <p className="text-xs text-amber-600">
                Uwaga: zmiana formatu w aktywnym sezonie nie wpływa na już istniejące ligi.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Punktacja */}
        <Card>
          <CardHeader>
            <CardTitle>Punktacja ligowa</CardTitle>
            <CardDescription>
              Ile punktów do tabeli zdobywa zawodnik za wynik meczu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {(["simple", "advanced"] as ScoringType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => !readonly && setScoringType(t)}
                  disabled={readonly}
                  className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    scoringType === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {t === "simple" ? "Prosta" : "Zaawansowana"}
                </button>
              ))}
            </div>

            {scoringType === "simple" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Wygrany (pkt)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={simpleWin}
                      onChange={(e) => setSimpleWin(parseInt(e.target.value, 10) || 0)}
                      disabled={readonly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Przegrany (pkt)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={simpleLoss}
                      onChange={(e) => setSimpleLoss(parseInt(e.target.value, 10) || 0)}
                      disabled={readonly}
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
                  Wyniki odwrotne (przegrane) generowane automatycznie.
                </p>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted border-b">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Wynik</th>
                        <th className="px-4 py-2.5 text-center font-medium">Zwycięzca (pkt)</th>
                        <th className="px-4 py-2.5 text-center font-medium">Przegrany (pkt)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultKeys.map((key, idx) => {
                        const [winPts, lossPts] = advancedResults[key] ?? [0, 0]
                        return (
                          <tr key={key} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <td className="px-4 py-2 font-mono font-semibold text-base">{key}</td>
                            <td className="px-3 py-1.5">
                              <Input
                                type="number"
                                min="0"
                                value={winPts}
                                onChange={(e) => setResultValue(key, 0, e.target.value)}
                                disabled={readonly}
                                className="text-center h-8 w-20 mx-auto"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <Input
                                type="number"
                                min="0"
                                value={lossPts}
                                onChange={(e) => setResultValue(key, 1, e.target.value)}
                                disabled={readonly}
                                className="text-center h-8 w-20 mx-auto"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 pb-6">
          <Button type="submit" disabled={loading || readonly}>
            {loading ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/center/competitions/${competitionId}/seasons/${season.id}`}>
              Wróć
            </Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
