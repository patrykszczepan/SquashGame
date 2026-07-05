"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { removePlayerFromLeague } from "@/lib/actions/competitions"
import { removeGuestPlayerFromLeague } from "@/lib/actions/leagues"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, Loader2 } from "lucide-react"

interface LeaguePlayer {
  id: string
  profile_id: string | null
  center_player_id: string | null
  position: number | null
  players: { first_name: string; last_name: string } | null
  center_players: { first_name: string; last_name: string; email: string | null; phone: string | null } | null
}

interface Props {
  leagueId: string
  leaguePlayers: LeaguePlayer[]
}

function getPlayerName(lp: LeaguePlayer): string {
  if (lp.players) return `${lp.players.last_name} ${lp.players.first_name}`
  if (lp.center_players) return `${lp.center_players.last_name} ${lp.center_players.first_name}`
  return "?"
}

export function LeaguePlayersPanel({ leagueId, leaguePlayers }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleRemove(lp: LeaguePlayer) {
    const key = lp.profile_id ?? lp.center_player_id ?? lp.id
    setLoadingId(key)
    if (lp.profile_id) {
      await removePlayerFromLeague(leagueId, lp.profile_id)
    } else if (lp.center_player_id) {
      await removeGuestPlayerFromLeague(leagueId, lp.center_player_id)
    }
    setLoadingId(null)
    router.refresh()
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left w-8 font-medium">#</th>
            <th className="px-4 py-3 text-left font-medium">Zawodnik</th>
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {leaguePlayers.map((lp, idx) => {
            const isGuest = !lp.profile_id && !!lp.center_player_id
            const key = lp.profile_id ?? lp.center_player_id ?? lp.id
            return (
              <tr key={lp.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getPlayerName(lp)}</span>
                    {isGuest && (
                      <Badge variant="secondary" className="text-xs font-normal">Bez konta</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(lp)}
                    disabled={loadingId === key}
                    title="Usuń z ligi"
                  >
                    {loadingId === key
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <X className="h-3.5 w-3.5" />}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
