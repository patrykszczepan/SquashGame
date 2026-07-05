"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { processLadderPositions } from "@/lib/actions/ladders"
import { Button } from "@/components/ui/button"

export function ProcessChallengeButton({ challengeId }: { challengeId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handle() {
    setLoading(true)
    const res = await processLadderPositions(challengeId)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <div>
      <Button size="sm" onClick={handle} disabled={loading}>
        {loading ? "..." : "Zatwierdź pozycje"}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
