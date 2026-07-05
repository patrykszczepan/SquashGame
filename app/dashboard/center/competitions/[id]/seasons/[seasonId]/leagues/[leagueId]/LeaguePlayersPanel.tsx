"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { assignPlayerToLeague, removePlayerFromLeague } from "@/lib/actions/competitions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPlus, X } from "lucide-react"

interface Player {
  profile_id: string
  players: { first_name: string; last_name: string }
}

interface Props {
  leagueId: string
  leaguePlayers: Player[]
  availablePlayers: Player[]
}

export function LeaguePlayersPanel({ leagueId, leaguePlayers, availablePlayers }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState("")
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAdd() {
    if (!selected) return
    setLoading("add")
    await assignPlayerToLeague(leagueId, selected)
    setSelected("")
    setLoading(null)
    router.refresh()
  }

  async function handleRemove(profileId: string) {
    setLoading(profileId)
    await removePlayerFromLeague(leagueId, profileId)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Add player */}
      {availablePlayers.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3">Dodaj zawodnika z puli rozgrywek:</p>
            <div className="flex gap-2">
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Wybierz zawodnika..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayers.map((cp) => (
                    <SelectItem key={cp.profile_id} value={cp.profile_id}>
                      {cp.players.first_name} {cp.players.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={!selected || loading === "add"}>
                <UserPlus className="h-4 w-4 mr-1" />
                Dodaj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current players */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-3">
            Zawodnicy w lidze ({leaguePlayers.length})
          </p>
          {leaguePlayers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak zawodników.</p>
          ) : (
            <div className="space-y-2">
              {leaguePlayers.map((lp, idx) => (
                <div
                  key={lp.profile_id}
                  className="flex items-center justify-between py-2 px-3 rounded-md border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-5">{idx + 1}.</span>
                    <span className="text-sm font-medium">
                      {lp.players.first_name} {lp.players.last_name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(lp.profile_id)}
                    disabled={loading === lp.profile_id}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
