"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { activateSeason } from "@/lib/actions/competitions"
import { Button } from "@/components/ui/button"

export function ActivateSeasonButton({ seasonId }: { seasonId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    setLoading(true)
    await activateSeason(seasonId)
    router.refresh()
  }

  return (
    <Button size="sm" onClick={handle} disabled={loading}>
      {loading ? "Aktywowanie..." : "Aktywuj sezon"}
    </Button>
  )
}
