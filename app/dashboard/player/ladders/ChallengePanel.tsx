"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { sendChallenge } from "@/lib/actions/ladders"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Swords } from "lucide-react"

interface Props {
  ladderId: string
  myPosition: number
  myProfileId: string
  maxDistance: number
  allPositions: any[]
  protectedUntil: string | null
}

export function ChallengePanel({
  ladderId,
  myPosition,
  myProfileId,
  maxDistance,
  allPositions,
  protectedUntil,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const isProtected = protectedUntil && new Date(protectedUntil) > new Date()

  // Targets: positions above mine within maxDistance, not me
  const targets = allPositions.filter(
    (p) => p.position < myPosition && myPosition - p.position <= maxDistance && p.profile_id !== myProfileId
  )

  async function handleChallenge() {
    if (!selected) return
    setLoading(true)
    setError("")
    const res = await sendChallenge(ladderId, selected)
    if (res.error) {
      setError(res.error)
    } else {
      setSuccess(true)
      router.refresh()
    }
    setLoading(false)
  }

  if (success) return <p className="text-sm text-green-600 font-medium">Wyzwanie wysłane!</p>

  return (
    <div className="space-y-2">
      {isProtected ? (
        <p className="text-xs text-muted-foreground">
          🛡 Chroniony do {new Date(protectedUntil!).toLocaleDateString("pl")}
        </p>
      ) : targets.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Brak dostępnych celów do wyzwania (max odległość: {maxDistance}).
        </p>
      ) : (
        <div className="flex gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Wyzwij zawodnika..." />
            </SelectTrigger>
            <SelectContent>
              {targets.map((t) => (
                <SelectItem key={t.profile_id} value={t.profile_id}>
                  #{t.position} — {t.players?.first_name} {t.players?.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleChallenge} disabled={!selected || loading}>
            <Swords className="h-4 w-4 mr-1" />
            Wyzwij
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
