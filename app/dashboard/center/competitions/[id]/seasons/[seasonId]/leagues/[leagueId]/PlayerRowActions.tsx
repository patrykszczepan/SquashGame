"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { assignPlayerToLeague, removePlayerFromLeague } from "@/lib/actions/competitions"
import { assignCenterPlayerToLeague, removeGuestPlayerFromLeague } from "@/lib/actions/leagues"
import { Button } from "@/components/ui/button"
import { UserPlus, X, Loader2 } from "lucide-react"

interface Props {
  leagueId: string
  inThisLeague: boolean
  leaguePlayerId?: string   // league_players.id — needed to remove
  profileId?: string
  centerPlayerId?: string
}

export function PlayerRowActions({ leagueId, inThisLeague, leaguePlayerId, profileId, centerPlayerId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleAssign() {
    setLoading(true)
    if (profileId) await assignPlayerToLeague(leagueId, profileId)
    else if (centerPlayerId) await assignCenterPlayerToLeague(leagueId, centerPlayerId)
    setLoading(false)
    router.refresh()
  }

  async function handleRemove() {
    setLoading(true)
    if (profileId) await removePlayerFromLeague(leagueId, profileId)
    else if (centerPlayerId) await removeGuestPlayerFromLeague(leagueId, centerPlayerId)
    setLoading(false)
    router.refresh()
  }

  if (loading) return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />

  if (inThisLeague) {
    return (
      <Button
        size="sm" variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
        title="Usuń z ligi"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    )
  }

  return (
    <Button
      size="sm" variant="ghost"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
      onClick={handleAssign}
      title="Przypisz do tej ligi"
    >
      <UserPlus className="h-3.5 w-3.5" />
    </Button>
  )
}
