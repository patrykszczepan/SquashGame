"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { archiveCompetition, deleteCompetition } from "@/lib/actions/competitions"
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
import { Archive, ArchiveRestore, Trash2 } from "lucide-react"

interface Props {
  competitionId: string
  competitionName: string
  isArchived: boolean
}

export function CompetitionActions({ competitionId, competitionName, isArchived }: Props) {
  const router = useRouter()
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleArchive() {
    setArchiveLoading(true)
    setError("")
    const result = await archiveCompetition(competitionId, !isArchived)
    setArchiveLoading(false)
    if (result.error) { setError(result.error); return }
    router.refresh()
  }

  async function handleDelete() {
    setDeleteLoading(true)
    setError("")
    const result = await deleteCompetition(competitionId)
    setDeleteLoading(false)
    if (result.error) { setError(result.error); return }
    router.push("/dashboard/center/competitions")
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-destructive">{error}</span>}

      <Button
        variant="outline"
        size="sm"
        onClick={handleArchive}
        disabled={archiveLoading}
      >
        {isArchived
          ? <><ArchiveRestore className="h-4 w-4 mr-1" />Przywróć</>
          : <><Archive className="h-4 w-4 mr-1" />Archiwizuj</>
        }
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={deleteLoading}>
            <Trash2 className="h-4 w-4 mr-1" />
            Usuń
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń rozgrywki</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć rozgrywki <strong>{competitionName}</strong>?
              Zostaną usunięte wszystkie sezony, ligi, mecze i zaproszenia. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń rozgrywki
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
