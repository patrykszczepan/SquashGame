"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { generateSchedule } from "@/lib/actions/competitions"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"

export function GenerateScheduleButton({ leagueId }: { leagueId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  async function handle() {
    setLoading(true)
    const res = await generateSchedule(leagueId)
    if (res.error) {
      setResult(`Błąd: ${res.error}`)
    } else {
      setResult(`Wygenerowano ${res.rounds} rund, ${res.matches} meczów.`)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <Button onClick={handle} disabled={loading}>
        <Calendar className="h-4 w-4 mr-2" />
        {loading ? "Generowanie..." : "Generuj terminarz"}
      </Button>
      {result && <p className="text-sm text-muted-foreground">{result}</p>}
    </div>
  )
}
