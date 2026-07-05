"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateLeague } from "@/lib/actions/leagues"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

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

interface Props {
  competitionId: string
  competitionName: string
  seasonId: string
  seasonName: string
  league: {
    id: string
    name: string
    level: number
    round_robin_mode: string
    match_format: { type: string; sets_to_win: number } | null
    promotions: number | null
    demotions: number | null
  }
}

export function EditLeagueForm({ competitionId, competitionName, seasonId, seasonName, league }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState(league.name)
  const [level, setLevel] = useState(league.level)
  const [roundRobinMode, setRoundRobinMode] = useState<"single" | "double">(
    (league.round_robin_mode as "single" | "double") ?? "single"
  )
  const [setsToWin, setSetsToWin] = useState(league.match_format?.sets_to_win ?? 3)
  const [promotions, setPromotions] = useState(league.promotions ?? 2)
  const [demotions, setDemotions] = useState(league.demotions ?? 2)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Podaj nazwę ligi."); return }
    setLoading(true)
    setError("")
    setSuccess(false)

    const result = await updateLeague(league.id, {
      name,
      level,
      round_robin_mode: roundRobinMode,
      sets_to_win: setsToWin,
      promotions: promotions ?? null,
      demotions: demotions ?? null,
    })

    setLoading(false)
    if (result.error) { setError(result.error); return }
    setSuccess(true)
    router.refresh()
  }

  const backUrl = `/dashboard/center/competitions/${competitionId}/seasons/${seasonId}/leagues/${league.id}`

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1 flex-wrap">
          <Link href="/dashboard/center/competitions" className="hover:underline">Rozgrywki</Link>
          <span>/</span>
          <Link href={`/dashboard/center/competitions/${competitionId}`} className="hover:underline">
            {competitionName}
          </Link>
          <span>/</span>
          <Link href={`/dashboard/center/competitions/${competitionId}/seasons/${seasonId}`} className="hover:underline">
            {seasonName}
          </Link>
          <span>/</span>
          <Link href={backUrl} className="hover:underline">{league.name}</Link>
          <span>/</span>
          <span>Edytuj</span>
        </div>
        <h1 className="text-2xl font-bold">Edytuj ligę</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {success && <Alert><AlertDescription>Zapisano zmiany.</AlertDescription></Alert>}

        <Card>
          <CardHeader><CardTitle>Dane ligi</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa ligi <span className="text-destructive">*</span></Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Poziom (1 = najwyższy)</Label>
              <Input
                id="level"
                type="number"
                min="1"
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value, 10) || 1)}
                className="w-28"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Format meczu</CardTitle>
            <CardDescription>Do ilu zwycięskich gemów grany jest mecz.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 items-center">
              {SETS_QUICK.map((n) => (
                <ToggleButton key={n} active={setsToWin === n} onClick={() => setSetsToWin(n)}>
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
                  if (!isNaN(n) && n >= 1) setSetsToWin(n)
                }}
                placeholder="inny"
                className={`flex-1 py-2 px-2 rounded-md border text-sm text-center transition-colors ${
                  setsToWin > 5 ? "border-primary bg-primary/5" : "border-border bg-background"
                } focus:outline-none focus:ring-2 focus:ring-ring`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rozgrywanie i klasyfikacja</CardTitle>
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
                <Label>Awanse (miejsc)</Label>
                <Input
                  type="number"
                  min="0"
                  value={promotions}
                  onChange={(e) => setPromotions(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Spadki (miejsc)</Label>
                <Input
                  type="number"
                  min="0"
                  value={demotions}
                  onChange={(e) => setDemotions(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 pb-6">
          <Button type="submit" disabled={loading}>
            {loading ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
          <Button variant="outline" asChild>
            <Link href={backUrl}>Wróć</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
