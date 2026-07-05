"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addGuestPlayerToCenter } from "@/lib/actions/center"
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

export function AddPlayerDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setFirstName("")
    setLastName("")
    setEmail("")
    setPhone("")
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError("Imię i nazwisko są wymagane.")
      return
    }
    setSubmitting(true)
    setError("")
    const result = await addGuestPlayerToCenter({
      first_name: firstName,
      last_name: lastName,
      email: email || undefined,
      phone: phone || undefined,
    })
    setSubmitting(false)
    if (result.error) { setError(result.error); return }
    setOpen(false)
    reset()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Dodaj zawodnika
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj zawodnika</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                Imię <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jan"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Nazwisko <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Kowalski"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail (opcjonalnie)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon (opcjonalnie)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+48 123 456 789"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Dodawanie...</>
                : "Dodaj zawodnika"
              }
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
