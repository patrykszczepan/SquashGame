"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User } from "lucide-react"
import { completePlayerProfile } from "./actions"

const SKILL_LEVELS = [
  { value: "beginner", label: "Początkujący" },
  { value: "intermediate", label: "Średniozaawansowany" },
  { value: "advanced", label: "Zaawansowany" },
]

interface Props {
  email: string
  initialFirstName: string
  initialLastName: string
}

export function PlayerOnboardingForm({ email, initialFirstName, initialLastName }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    first_name: initialFirstName,
    last_name: initialLastName,
    phone: "",
    skill_level: "beginner",
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const result = await completePlayerProfile(form)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md overflow-hidden pt-0">
        <CardHeader className="text-center bg-primary/5 border-b py-8">
          <div className="flex justify-center mb-3">
            <div className="rounded-full bg-primary/15 p-4">
              <User className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Uzupełnij profil zawodnika</CardTitle>
          <CardDescription className="mt-1">{email}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">Imię *</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nazwisko *</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  placeholder="+48 123 456 789"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill_level">Poziom gry</Label>
                <Select value={form.skill_level} onValueChange={(v) => set("skill_level", v)}>
                  <SelectTrigger id="skill_level" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-[--radix-select-trigger-width]">
                    {SKILL_LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-6">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Zapisywanie..." : "Zapisz i przejdź do panelu"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
