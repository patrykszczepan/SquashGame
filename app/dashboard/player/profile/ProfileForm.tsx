"use client"

import { useState } from "react"
import { updatePlayerProfile, updateEmail, updatePassword } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2 } from "lucide-react"

interface Props {
  player: {
    first_name: string
    last_name: string
    phone: string | null
  }
  email: string
}

export function ProfileForm({ player, email }: Props) {
  const [profileForm, setProfileForm] = useState({
    first_name: player.first_name,
    last_name: player.last_name,
    phone: player.phone ?? "",
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [newEmail, setNewEmail] = useState("")
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMsg(null)
    const res = await updatePlayerProfile(profileForm)
    setProfileLoading(false)
    setProfileMsg("error" in res
      ? { type: "error", text: res.error }
      : { type: "success", text: "Dane zostały zapisane." }
    )
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail) return
    setEmailLoading(true)
    setEmailMsg(null)
    const res = await updateEmail(newEmail)
    setEmailLoading(false)
    setEmailMsg("error" in res
      ? { type: "error", text: res.error }
      : { type: "success", text: "Wysłano link potwierdzający na nowy adres email." }
    )
    if (!("error" in res)) setNewEmail("")
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordMsg({ type: "error", text: "Nowe hasła nie są identyczne." })
      return
    }
    if (passwordForm.next.length < 8) {
      setPasswordMsg({ type: "error", text: "Hasło musi mieć co najmniej 8 znaków." })
      return
    }
    setPasswordLoading(true)
    setPasswordMsg(null)
    const res = await updatePassword({ currentPassword: passwordForm.current, newPassword: passwordForm.next })
    setPasswordLoading(false)
    setPasswordMsg("error" in res
      ? { type: "error", text: res.error }
      : { type: "success", text: "Hasło zostało zmienione." }
    )
    if (!("error" in res)) setPasswordForm({ current: "", next: "", confirm: "" })
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Basic data */}
      <Card>
        <CardHeader>
          <CardTitle>Dane osobowe</CardTitle>
          <CardDescription>Imię, nazwisko i telefon widoczne dla organizatorów.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfile} className="space-y-4">
            {profileMsg && (
              <Alert variant={profileMsg.type === "error" ? "destructive" : "default"}>
                {profileMsg.type === "success" && <CheckCircle2 className="h-4 w-4" />}
                <AlertDescription>{profileMsg.text}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">Imię <span className="text-destructive">*</span></Label>
                <Input
                  id="first_name"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nazwisko <span className="text-destructive">*</span></Label>
                <Input
                  id="last_name"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+48 000 000 000"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <CardTitle>Adres email</CardTitle>
          <CardDescription>Aktualny: <span className="font-medium text-foreground">{email}</span></CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmail} className="space-y-4">
            {emailMsg && (
              <Alert variant={emailMsg.type === "error" ? "destructive" : "default"}>
                {emailMsg.type === "success" && <CheckCircle2 className="h-4 w-4" />}
                <AlertDescription>{emailMsg.text}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="new_email">Nowy adres email</Label>
              <Input
                id="new_email"
                type="email"
                placeholder="nowy@email.pl"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={emailLoading || !newEmail}>
              {emailLoading ? "Wysyłanie..." : "Zmień email"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Zmiana hasła</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePassword} className="space-y-4">
            {passwordMsg && (
              <Alert variant={passwordMsg.type === "error" ? "destructive" : "default"}>
                {passwordMsg.type === "success" && <CheckCircle2 className="h-4 w-4" />}
                <AlertDescription>{passwordMsg.text}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="current_password">Aktualne hasło</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
                required
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="new_password">Nowe hasło</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="min. 8 znaków"
                value={passwordForm.next}
                onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Potwierdź nowe hasło</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                required
              />
            </div>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Zmienianie..." : "Zmień hasło"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
