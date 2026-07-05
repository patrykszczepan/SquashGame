"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { assignPlayerToLeague } from "@/lib/actions/competitions"
import { assignCenterPlayerToLeague } from "@/lib/actions/leagues"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { UserPlus, Search, Loader2 } from "lucide-react"

interface RegisteredPlayer {
  profile_id: string
  players: { first_name: string; last_name: string }
}

interface CenterPlayer {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
}

interface Props {
  leagueId: string
  availableRegistered: RegisteredPlayer[]
  availableCenterPlayers: CenterPlayer[]
  profileInLeague: Record<string, string>
  centerPlayerInLeague: Record<string, string>
}

export function AssignLeaguePlayersDialog({
  leagueId,
  availableRegistered,
  availableCenterPlayers,
  profileInLeague,
  centerPlayerInLeague,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Players already in another league are shown greyed out — not selectable
  const isInOtherLeague = (key: string) => {
    if (key.startsWith("r:")) return !!profileInLeague[key.slice(2)]
    return !!centerPlayerInLeague[key.slice(2)]
  }

  const otherLeagueName = (key: string) => {
    if (key.startsWith("r:")) return profileInLeague[key.slice(2)] ?? ""
    return centerPlayerInLeague[key.slice(2)] ?? ""
  }

  const totalAssignable =
    availableRegistered.filter((p) => !profileInLeague[p.profile_id]).length +
    availableCenterPlayers.filter((p) => !centerPlayerInLeague[p.id]).length

  function handleOpen(v: boolean) {
    setOpen(v)
    if (!v) { setQuery(""); setSelected(new Set()); setError("") }
  }

  function toggle(key: string) {
    if (isInOtherLeague(key)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAll(keys: string[]) {
    const assignable = keys.filter((k) => !isInOtherLeague(k))
    const allSelected = assignable.length > 0 && assignable.every((k) => selected.has(k))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) assignable.forEach((k) => next.delete(k))
      else assignable.forEach((k) => next.add(k))
      return next
    })
  }

  const q = query.trim().toLowerCase()

  const filteredRegistered = availableRegistered.filter((p) => {
    if (!q) return true
    const name = `${p.players.first_name} ${p.players.last_name}`.toLowerCase()
    return name.includes(q)
  })

  const filteredGuests = availableCenterPlayers.filter((p) => {
    if (!q) return true
    const name = `${p.first_name} ${p.last_name}`.toLowerCase()
    return name.includes(q) || (p.phone ?? "").includes(q) || (p.email ?? "").toLowerCase().includes(q)
  })

  const filteredKeys = [
    ...filteredRegistered.map((p) => `r:${p.profile_id}`),
    ...filteredGuests.map((p) => `g:${p.id}`),
  ]
  const assignableKeys = filteredKeys.filter((k) => !isInOtherLeague(k))
  const allAssignableSelected = assignableKeys.length > 0 && assignableKeys.every((k) => selected.has(k))

  async function handleSubmit() {
    if (selected.size === 0) return
    setSubmitting(true)
    setError("")

    const errors: string[] = []
    for (const key of selected) {
      if (key.startsWith("r:")) {
        const res = await assignPlayerToLeague(leagueId, key.slice(2))
        if (res?.error) errors.push(res.error)
      } else {
        const res = await assignCenterPlayerToLeague(leagueId, key.slice(2))
        if (res?.error) errors.push(res.error)
      }
    }

    setSubmitting(false)

    if (errors.length > 0) {
      setError(errors[0])
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={totalAssignable === 0}
          title={totalAssignable === 0 ? "Brak zawodników do przypisania" : undefined}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Przypisz zawodników
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Przypisz zawodników do ligi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Szukaj po nazwisku, imieniu..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Select all (only assignable) */}
          {assignableKeys.length > 1 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none px-1">
              <Checkbox
                checked={allAssignableSelected}
                onCheckedChange={() => toggleAll(filteredKeys)}
              />
              <span className="text-muted-foreground">Zaznacz wszystkich ({assignableKeys.length})</span>
            </label>
          )}

          {/* Player list */}
          <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            {filteredKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {q ? "Brak wyników." : "Brak dostępnych zawodników."}
              </p>
            ) : (
              <>
                {/* Registered */}
                {filteredRegistered.length > 0 && (
                  <>
                    <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b sticky top-0">
                      Z kontem ({filteredRegistered.length})
                    </div>
                    {filteredRegistered.map((p) => {
                      const key = `r:${p.profile_id}`
                      const inOther = isInOtherLeague(key)
                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-3 px-3 py-2.5 border-b last:border-0 ${inOther ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/30 cursor-pointer"}`}
                        >
                          <Checkbox
                            checked={selected.has(key)}
                            onCheckedChange={() => toggle(key)}
                            disabled={inOther}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm">{p.players.last_name} {p.players.first_name}</span>
                            {inOther && (
                              <span className="text-xs text-muted-foreground">
                                Zawodnik dodany już do ligi {otherLeagueName(key)}
                              </span>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </>
                )}

                {/* Center players (guests) */}
                {filteredGuests.length > 0 && (
                  <>
                    <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-t sticky top-0">
                      Bez konta ({filteredGuests.length})
                    </div>
                    {filteredGuests.map((p) => {
                      const key = `g:${p.id}`
                      const inOther = isInOtherLeague(key)
                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-3 px-3 py-2.5 border-b last:border-0 ${inOther ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/30 cursor-pointer"}`}
                        >
                          <Checkbox
                            checked={selected.has(key)}
                            onCheckedChange={() => toggle(key)}
                            disabled={inOther}
                          />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{p.last_name} {p.first_name}</span>
                              <Badge variant="outline" className="text-xs font-normal shrink-0">Bez konta</Badge>
                              {p.phone && !inOther && (
                                <span className="text-xs text-muted-foreground truncate">{p.phone}</span>
                              )}
                            </div>
                            {inOther && (
                              <span className="text-xs text-muted-foreground">
                                Zawodnik dodany już do ligi {otherLeagueName(key)}
                              </span>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={selected.size === 0 || submitting}
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Przypisywanie...</>
                : `Przypisz${selected.size > 0 ? ` (${selected.size})` : ""}`}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
