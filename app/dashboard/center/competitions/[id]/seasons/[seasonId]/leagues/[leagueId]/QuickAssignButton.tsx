"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { assignPlayerToLeague } from "@/lib/actions/competitions"
import { assignCenterPlayerToLeague } from "@/lib/actions/leagues"
import { Button } from "@/components/ui/button"
import { UserPlus, Loader2 } from "lucide-react"

interface Props {
  leagueId: string
  profileId?: string
  centerPlayerId?: string
}

export function QuickAssignButton({ leagueId, profileId, centerPlayerId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    if (profileId) await assignPlayerToLeague(leagueId, profileId)
    else if (centerPlayerId) await assignCenterPlayerToLeague(leagueId, centerPlayerId)
    setLoading(false)
    router.refresh()
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
      onClick={handle}
      disabled={loading}
      title="Przypisz do tej ligi"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
    </Button>
  )
}
