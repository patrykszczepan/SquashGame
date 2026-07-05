"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  createScoringTemplate,
  updateScoringTemplate,
  deleteScoringTemplate,
} from "@/lib/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Pencil, Plus, Trash2 } from "lucide-react"

interface Template {
  id: string
  name: string
  description?: string
  config: any
  is_global: boolean
}

interface Props {
  templates: Template[]
}

const defaultConfig = JSON.stringify(
  { sets_to_win: 3, points_per_set: 11, tiebreak: true },
  null,
  2
)

function TemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Template>
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [config, setConfig] = useState(
    initial?.config ? JSON.stringify(initial.config, null, 2) : defaultConfig
  )
  const [isGlobal, setIsGlobal] = useState(initial?.is_global ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handle() {
    let parsedConfig
    try {
      parsedConfig = JSON.parse(config)
    } catch {
      setError("Nieprawidłowy JSON w konfiguracji.")
      return
    }
    setLoading(true)
    await onSave({ name, description, config: parsedConfig, is_global: isGlobal })
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Nazwa</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Squash 3 do 11" />
      </div>
      <div className="space-y-1">
        <Label>Opis (opcjonalnie)</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Konfiguracja (JSON)</Label>
        <textarea
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={config}
          onChange={(e) => setConfig(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_global"
          checked={isGlobal}
          onChange={(e) => setIsGlobal(e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="is_global">Globalny (dostępny dla wszystkich centrów)</Label>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Anuluj</Button>
        <Button onClick={handle} disabled={loading || !name}>
          {loading ? "..." : "Zapisz"}
        </Button>
      </div>
    </div>
  )
}

export function ScoringTemplatesManager({ templates }: Props) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleCreate(data: any) {
    await createScoringTemplate(data)
    setCreateOpen(false)
    router.refresh()
  }

  async function handleUpdate(id: string, data: any) {
    await updateScoringTemplate(id, data)
    setEditId(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await deleteScoringTemplate(id)
    setDeleting(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nowy szablon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nowy szablon punktacji</DialogTitle>
            </DialogHeader>
            <TemplateForm onSave={handleCreate} onCancel={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Brak szablonów punktacji.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <div className="flex gap-1">
                    <Dialog
                      open={editId === t.id}
                      onOpenChange={(o) => setEditId(o ? t.id : null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edytuj szablon</DialogTitle>
                        </DialogHeader>
                        <TemplateForm
                          initial={t}
                          onSave={(data) => handleUpdate(t.id, data)}
                          onCancel={() => setEditId(null)}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {t.description && (
                  <p className="text-xs text-muted-foreground mb-2">{t.description}</p>
                )}
                <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
                  {JSON.stringify(t.config, null, 2)}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  {t.is_global ? "Globalny" : "Prywatny"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
