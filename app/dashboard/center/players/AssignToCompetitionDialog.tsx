"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { getPlayersAvailableForCompetition } from "@/lib/actions/center"
import { addPlayerToCompetition } from "@/lib/actions/competitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { UserCheck, Search, Loader2, Check } from "lucide-react"

interface Competition { id: string; name: string }
interface RegisteredPlayer { profile_id: string; first_name: string; last_name: string; phone: string | null }
interface GuestPlayer { id: string; first_name: string; last_name: string; email: string | null; phone: string | null }

export function AssignToCompetitionDialog({ competitions }: { competitions: Competition[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [competitionId, setCompetitionId] = useState(competitions[0]?.id ?? "")
  const [query, setQuery] = useState("")
  const [registered, setRegistered] = useState<RegisteredPlayer[]>([])
  const [guests, setGuests] = useState<GuestPlayer[]>([])
  const [loading, startLoading] = useTransition()
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState("")

  function handleOpen(v: boolean) {
    setOpen(v)
    if (v) loadPlayers(competitionId)
    else { setQuery(""); setAddedIds(new Set()); setError("") }
  }

  function loadPlayers(compId: string) {
    startLoading(async () => {
      const result = await getPlayersAvailableForCompetition(compId)
      setRegistered(result.registered as RegisteredPlayer[])
      setGuests(result.guests as GuestPlayer[])
    })
  }

  function handleCompetitionChange(compId: string) {
    setCompetitionId(compId)
    setAddedIds(new Set())
    setQuery("")
    loadPlayers(compId)
  }

  async function handleAdd(profileId: string) {
    setAddingId(profileId)
    setError("")
    const result = await addPlayerToCompetition(competitionId, profileId)
    setAddingId(null)
    if (result.error) { setError(result.error); return }
    setAddedIds((prev) => new Set(prev).add(profileId))
    router.refresh()
  }

  const q = query.trim().toLowerCase()

  const filteredRegistered = q
    ? registered.filter(
        (p) =>
          p.first_name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q) ||
          (p.phone ?? "").includes(q)
      )
    : registered

  const filteredGuests = q
    ? guests.filter(
        (p) =>
          p.first_name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q) ||
          (p.email ?? "").toLowerCase().includes(q) ||
          (p.phone ?? "").includes(q)
      )
    : guests

  const totalVisible = filteredRegistered.length + filteredGuests.length

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserCheck className="h-4 w-4 mr-2" />
          Przypisz do rozgrywki
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Przypisz zawodnika do rozgrywki</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Competition select */}
          <Select value={competitionId} onValueChange={handleCompetitionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz rozgrywkę..." />
            </SelectTrigger>
            <SelectContent>
              {competitions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          {/* Player list */}
          <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Ładowanie...
              </div>
            ) : totalVisible === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {q ? "Brak wyników." : "Wszyscy zawodnicy są już przypisani do tej rozgrywki."}
              </p>
            ) : (
              <>
                {/* Registered players */}
                {filteredRegistered.length > 0 && (
                  <>
                    <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                      Z kontem ({filteredRegistered.length})
                    </div>
                    {filteredRegistered.map((p) => {
                      const added = addedIds.has(p.profile_id)
                      return (
                        <div
                          key={p.profile_id}
                          className="flex items-center justify-between px-3 py-2.5 border-b last:border-0 hover:bg-muted/30"
                        >
                          <div>
                            <span className="text-sm font-medium">{p.last_name} {p.first_name}</span>
                            {p.phone && (
                              <span className="ml-2 text-xs text-muted-foreground">{p.phone}</span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={added ? "secondary" : "default"}
                            className="h-7 text-xs"
                            onClick={() => !added && handleAdd(p.profile_id)}
                            disabled={!!addingId || added}
                          >
                            {addingId === p.profile_id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : added
                              ? <><Check className="h-3 w-3 mr-1" />Dodano</>
                              : "Dodaj"
                            }
                          </Button>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* Offline / guest players */}
                {filteredGuests.length > 0 && (
                  <>
                    <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-t">
                      Bez konta ({filteredGuests.length})
                    </div>
                    {filteredGuests.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-3 py-2.5 border-b last:border-0 hover:bg-muted/30"
                      >
                        <div>
                          <span className="text-sm font-medium">{p.last_name} {p.first_name}</span>
                          <Badge variant="outline" className="ml-2 text-xs font-normal">Bez konta</Badge>
                          {p.phone && (
                            <span className="ml-2 text-xs text-muted-foreground">{p.phone}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">dodaj w lidze</span>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
