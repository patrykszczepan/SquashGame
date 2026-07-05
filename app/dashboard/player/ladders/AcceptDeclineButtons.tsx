"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { acceptChallenge, declineChallenge } from "@/lib/actions/ladders"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"

export function AcceptDeclineButtons({ challengeId }: { challengeId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null)
  const [error, setError] = useState("")

  async function handleAccept() {
    setLoading("accept")
    const res = await acceptChallenge(challengeId)
    if (res.error) { setError(res.error); setLoading(null) }
    else router.refresh()
  }

  async function handleDecline() {
    setLoading("decline")
    const res = await declineChallenge(challengeId)
    if (res.error) { setError(res.error); setLoading(null) }
    else router.refresh()
  }

  return (
    <div className="mt-3 space-y-1">
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={handleAccept} disabled={!!loading}>
          <Check className="h-3 w-3 mr-1" />
          {loading === "accept" ? "..." : "Akceptuj"}
        </Button>
        <Button size="sm" variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleDecline} disabled={!!loading}>
          <X className="h-3 w-3 mr-1" />
          {loading === "decline" ? "..." : "Odrzuć"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
