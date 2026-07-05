"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addLadderPlayer, removeLadderPlayer } from "@/lib/actions/ladders"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"

interface Props {
  ladderId: string
  positions: any[]
  availablePlayers: any[]
}

export function LadderManagePanel({ ladderId, positions, availablePlayers }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState("")
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAdd() {
    if (!selected) return
    setLoading("add")
    await addLadderPlayer(ladderId, selected)
    setSelected("")
    setLoading(null)
    router.refresh()
  }

  async function handleRemove(profileId: string) {
    setLoading(profileId)
    await removeLadderPlayer(ladderId, profileId)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {availablePlayers.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3">Dodaj zawodnika (trafi na koniec rankingu):</p>
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
                Dodaj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-3">Zawodnicy ({positions.length})</p>
          {positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak.</p>
          ) : (
            <div className="space-y-2">
              {positions.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-md border">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary w-6">{p.position}.</span>
                    <span className="text-sm">{p.players?.first_name} {p.players?.last_name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(p.profile_id)}
                    disabled={loading === p.profile_id}
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
