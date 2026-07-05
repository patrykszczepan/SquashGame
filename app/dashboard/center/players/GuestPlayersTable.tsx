"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateCenterPlayer, archiveCenterPlayer, deleteCenterPlayer } from "@/lib/actions/center"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Pencil, Archive, ArchiveRestore, Trash2, Loader2 } from "lucide-react"

interface GuestPlayer {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  is_archived: boolean
}

export function GuestPlayersTable({ players }: { players: GuestPlayer[] }) {
  const router = useRouter()
  const [editPlayer, setEditPlayer] = useState<GuestPlayer | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState("")

  // Edit form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [editError, setEditError] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  function openEdit(p: GuestPlayer) {
    setEditPlayer(p)
    setFirstName(p.first_name)
    setLastName(p.last_name)
    setEmail(p.email ?? "")
    setPhone(p.phone ?? "")
    setEditError("")
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editPlayer || !firstName.trim() || !lastName.trim()) {
      setEditError("Imię i nazwisko są wymagane.")
      return
    }
    setEditSaving(true)
    setEditError("")
    const result = await updateCenterPlayer(editPlayer.id, {
      first_name: firstName,
      last_name: lastName,
      email: email || undefined,
      phone: phone || undefined,
    })
    setEditSaving(false)
    if (result.error) { setEditError(result.error); return }
    setEditPlayer(null)
    router.refresh()
  }

  async function handleArchive(id: string, archive: boolean) {
    setLoadingId(id)
    setActionError("")
    const result = await archiveCenterPlayer(id, archive)
    setLoadingId(null)
    if (result.error) { setActionError(result.error); return }
    router.refresh()
  }

  async function handleDelete(id: string) {
    setLoadingId(id)
    setActionError("")
    const result = await deleteCenterPlayer(id)
    setLoadingId(null)
    if (result.error) { setActionError(result.error); return }
    router.refresh()
  }

  const active = players.filter((p) => !(p.is_archived ?? false))
  const archived = players.filter((p) => p.is_archived ?? false)

  return (
    <>
      {/* Edit dialog */}
      <Dialog open={!!editPlayer} onOpenChange={(v) => { if (!v) setEditPlayer(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edytuj zawodnika</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            {editError && (
              <Alert variant="destructive">
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Imię <span className="text-destructive">*</span></Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nazwisko <span className="text-destructive">*</span></Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail (opcjonalnie)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefon (opcjonalnie)</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={editSaving} className="flex-1">
                {editSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Zapisywanie...</> : "Zapisz"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditPlayer(null)}>
                Anuluj
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Action error */}
      {actionError && (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Active players */}
      {active.length > 0 && (
        <PlayerTable
          players={active}
          loadingId={loadingId}
          onEdit={openEdit}
          onArchive={(id) => handleArchive(id, true)}
          onDelete={handleDelete}
        />
      )}

      {/* Archived players */}
      {archived.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">Zarchiwizowani ({archived.length})</p>
          <PlayerTable
            players={archived}
            loadingId={loadingId}
            onEdit={openEdit}
            onArchive={(id) => handleArchive(id, false)}
            onDelete={handleDelete}
            dimmed
          />
        </div>
      )}
    </>
  )
}

function PlayerTable({
  players,
  loadingId,
  onEdit,
  onArchive,
  onDelete,
  dimmed = false,
}: {
  players: GuestPlayer[]
  loadingId: string | null
  onEdit: (p: GuestPlayer) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  dimmed?: boolean
}) {
  return (
    <Card className={`py-0${dimmed ? " opacity-60" : ""}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Zawodnik</th>
              <th className="px-4 py-3 text-left font-medium">E-mail</th>
              <th className="px-4 py-3 text-left font-medium">Telefon</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">
                  {p.last_name} {p.first_name}
                  <Badge variant="outline" className="ml-2 text-xs font-normal">Bez konta</Badge>
                  {p.is_archived && (
                    <Badge variant="secondary" className="ml-1 text-xs font-normal">Arch.</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.email ?? <span className="opacity-40">—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.phone ?? <span className="opacity-40">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Edit */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => onEdit(p)}
                      disabled={loadingId === p.id}
                      title="Edytuj"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    {/* Archive / Restore */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => onArchive(p.id)}
                      disabled={loadingId === p.id}
                      title={p.is_archived ? "Przywróć" : "Archiwizuj"}
                    >
                      {loadingId === p.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : p.is_archived
                        ? <ArchiveRestore className="h-3.5 w-3.5" />
                        : <Archive className="h-3.5 w-3.5" />
                      }
                    </Button>

                    {/* Delete */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          disabled={loadingId === p.id}
                          title="Usuń"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Usuń zawodnika</AlertDialogTitle>
                          <AlertDialogDescription>
                            Czy na pewno chcesz usunąć <strong>{p.first_name} {p.last_name}</strong>?
                            Zawodnik zostanie usunięty ze wszystkich lig.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onDelete(p.id)}
                          >
                            Usuń
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
