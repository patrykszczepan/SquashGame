"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addGuestPlayerToLeague } from "@/lib/actions/leagues"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { UserPlus, Loader2 } from "lucide-react"

export function AddGuestToLeagueDialog({ leagueId }: { leagueId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  function handleOpen(v: boolean) {
    setOpen(v)
    if (!v) {
      setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setError("")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError("Imię i nazwisko są wymagane.")
      return
    }
    setSaving(true)
    setError("")
    const result = await addGuestPlayerToLeague(leagueId, {
      first_name: firstName,
      last_name: lastName,
      email: email || undefined,
      phone: phone || undefined,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          Dodaj zawodnika
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj zawodnika bez konta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Imię <span className="text-destructive">*</span></Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jan"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Nazwisko <span className="text-destructive">*</span></Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Kowalski"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>E-mail <span className="text-muted-foreground text-xs">(opcjonalnie)</span></Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Telefon <span className="text-muted-foreground text-xs">(opcjonalnie)</span></Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+48 123 456 789"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Zawodnik zostanie dodany do ligi oraz do listy zawodników centrum.
          </p>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Dodawanie...</> : "Dodaj zawodnika"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
