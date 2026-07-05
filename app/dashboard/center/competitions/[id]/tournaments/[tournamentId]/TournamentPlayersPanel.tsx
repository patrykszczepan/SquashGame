"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  addTournamentPlayer,
  removeTournamentPlayer,
  generateTournamentBracket,
} from "@/lib/actions/tournaments"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Play } from "lucide-react"

interface Props {
  tournamentId: string
  currentPlayerIds: string[]
  nameMap: Record<string, string>
  availablePlayers: any[]
  status: string
}

export function TournamentPlayersPanel({
  tournamentId,
  currentPlayerIds,
  nameMap,
  availablePlayers,
  status,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState("")
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const isDraft = status === "draft"

  const notYetAdded = availablePlayers.filter(
    (cp) => !currentPlayerIds.includes(cp.profile_id)
  )

  async function handleAdd() {
    if (!selected) return
    setLoading("add")
    await addTournamentPlayer(tournamentId, selected)
    setSelected("")
    setLoading(null)
    router.refresh()
  }

  async function handleRemove(profileId: string) {
    setLoading(profileId)
    await removeTournamentPlayer(tournamentId, profileId)
    setLoading(null)
    router.refresh()
  }

  async function handleGenerate() {
    setLoading("generate")
    const res = await generateTournamentBracket(tournamentId)
    if (res.error) {
      setError(res.error)
      setLoading(null)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      {isDraft && notYetAdded.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3">Dodaj z puli rozgrywek:</p>
            <div className="flex gap-2">
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Wybierz zawodnika..." />
                </SelectTrigger>
                <SelectContent>
                  {notYetAdded.map((cp) => (
                    <SelectItem key={cp.profile_id} value={cp.profile_id}>
                      {cp.players.first_name} {cp.players.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={!selected || loading === "add"}>
                Dodaj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-3">
            Zgłoszeni zawodnicy ({currentPlayerIds.length})
          </p>
          {currentPlayerIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak zawodników.</p>
          ) : (
            <div className="space-y-2">
              {currentPlayerIds.map((pid, i) => (
                <div key={pid} className="flex items-center justify-between py-2 px-3 rounded-md border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-5">{i + 1}.</span>
                    <span className="text-sm font-medium">{nameMap[pid] ?? pid}</span>
                  </div>
                  {isDraft && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleRemove(pid)}
                      disabled={loading === pid}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isDraft && currentPlayerIds.length >= 2 && (
        <div className="space-y-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            onClick={handleGenerate}
            disabled={loading === "generate"}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            {loading === "generate" ? "Generowanie..." : "Generuj drabinkę i startuj"}
          </Button>
        </div>
      )}
    </div>
  )
}
