"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { assignPlayerToLeague } from "@/lib/actions/competitions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserPlus, Loader2 } from "lucide-react"

interface League { id: string; name: string; level: number }
interface Season { id: string; name: string; status: string; leagues: League[] }

interface Props {
  profileId: string
  playerName: string
  seasons: Season[]
  currentLeagueName?: string
}

export function AssignCompetitionPlayerDialog({ profileId, playerName, seasons, currentLeagueName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [seasonId, setSeasonId] = useState("")
  const [leagueId, setLeagueId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const activeSeasons = seasons.filter((s) => s.leagues.length > 0)
  const selectedSeason = activeSeasons.find((s) => s.id === seasonId)
  const leagues = selectedSeason?.leagues.sort((a, b) => a.level - b.level) ?? []

  function handleOpen(v: boolean) {
    setOpen(v)
    if (!v) { setSeasonId(""); setLeagueId(""); setError("") }
  }

  async function handleSubmit() {
    if (!leagueId) return
    setSubmitting(true)
    setError("")
    const res = await assignPlayerToLeague(leagueId, profileId)
    setSubmitting(false)
    if (res?.error) { setError(res.error); return }
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Przypisz do ligi">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Przypisz do ligi</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Zawodnik: <span className="font-medium text-foreground">{playerName}</span>
          </p>
          {currentLeagueName && (
            <p className="text-xs text-muted-foreground">
              Aktualnie w: <Badge variant="secondary" className="text-xs">{currentLeagueName}</Badge>
            </p>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {activeSeasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak sezonów z ligami w tych rozgrywkach.</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Sezon</Label>
                <Select value={seasonId} onValueChange={(v) => { setSeasonId(v); setLeagueId("") }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz sezon..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSeasons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {s.status === "active" && (
                          <span className="ml-2 text-xs text-muted-foreground">(aktywny)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {seasonId && (
                <div className="space-y-2">
                  <Label>Liga</Label>
                  <Select value={leagueId} onValueChange={setLeagueId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz ligę..." />
                    </SelectTrigger>
                    <SelectContent>
                      {leagues.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          Liga {l.level} — {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" onClick={handleSubmit} disabled={!leagueId || submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Przypisywanie...</> : "Przypisz"}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
