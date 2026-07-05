"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { closeSeason } from "@/lib/actions/seasons"
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

export function CloseSeasonButton({ seasonId }: { seasonId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handle() {
    setLoading(true)
    const res = await closeSeason(seasonId)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={loading}>
            {loading ? "Zamykanie..." : "Zamknij sezon"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zamknąć sezon?</AlertDialogTitle>
            <AlertDialogDescription>
              Zostaną obliczone awanse i spadki na podstawie aktualnych tabel.
              Sezon zostanie oznaczony jako zakończony. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handle} disabled={loading}>
              Zamknij sezon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
