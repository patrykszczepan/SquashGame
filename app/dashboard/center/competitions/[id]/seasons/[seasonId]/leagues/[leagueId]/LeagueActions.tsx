"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { archiveLeague, deleteLeague } from "@/lib/actions/leagues"
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
import { Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react"

interface Props {
  leagueId: string
  leagueName: string
  isArchived: boolean
  competitionId: string
  seasonId: string
}

export function LeagueActions({ leagueId, leagueName, isArchived, competitionId, seasonId }: Props) {
  const router = useRouter()
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleArchive() {
    setArchiveLoading(true)
    setError("")
    const result = await archiveLeague(leagueId, !isArchived)
    setArchiveLoading(false)
    if (result.error) { setError(result.error); return }
    router.refresh()
  }

  async function handleDelete() {
    setDeleteLoading(true)
    setError("")
    const result = await deleteLeague(leagueId)
    setDeleteLoading(false)
    if (result.error) { setError(result.error); return }
    router.push(`/dashboard/center/competitions/${competitionId}/seasons/${seasonId}`)
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-destructive">{error}</span>}

      <Button variant="outline" size="sm" asChild>
        <Link href={`/dashboard/center/competitions/${competitionId}/seasons/${seasonId}/leagues/${leagueId}/edit`}>
          <Pencil className="h-4 w-4 mr-1" />
          Edytuj
        </Link>
      </Button>

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
            <AlertDialogTitle>Usuń ligę</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć ligę <strong>{leagueName}</strong>?
              Zostaną usunięci zawodnicy, rundy i mecze. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń ligę
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
