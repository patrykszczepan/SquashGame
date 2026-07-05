"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { generateSchedule, deleteSchedule } from "@/lib/actions/competitions"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Calendar, RotateCcw } from "lucide-react"

export function GenerateScheduleButton({ leagueId }: { leagueId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    const res = await generateSchedule(leagueId)
    setLoading(false)
    if (res.error) {
      setError(res.error)
    } else {
      setSuccess(`Wygenerowano ${res.rounds} ${res.rounds === 1 ? "rundę" : "rundy"}, ${res.matches} meczów.`)
      router.refresh()
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleGenerate} disabled={loading}>
        <Calendar className="h-4 w-4 mr-2" />
        {loading ? "Generowanie..." : "Generuj terminarz"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-muted-foreground">{success}</p>}
    </div>
  )
}

export function ResetScheduleButton({ leagueId }: { leagueId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleReset() {
    setLoading(true)
    await deleteSchedule(leagueId)
    setLoading(false)
    router.refresh()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading} title="Usuń terminarz i wygeneruj od nowa">
          <RotateCcw className="h-4 w-4 mr-2" />
          Zresetuj terminarz
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Zresetuj terminarz</AlertDialogTitle>
          <AlertDialogDescription>
            Spowoduje to usunięcie wszystkich rund i meczów (łącznie z wynikami).
            Operacji nie można cofnąć.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleReset}
          >
            Usuń i zresetuj
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
