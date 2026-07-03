"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User } from "lucide-react"

const SKILL_LEVELS = [
  { value: "beginner", label: "Początkujący" },
  { value: "intermediate", label: "Średni" },
  { value: "advanced", label: "Zaawansowany" },
]

export default function RegisterPlayerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
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

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Błąd rejestracji.")
      setLoading(false)
      return
    }

    const userId = data.user.id

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: userId, role: "player" })

    if (profileError) {
      setError("Błąd tworzenia profilu.")
      setLoading(false)
      return
    }

    const { error: playerError } = await supabase
      .from("players")
      .insert({
        profile_id: userId,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
        skill_level: form.skill_level,
      })

    if (playerError) {
      setError("Błąd tworzenia profilu zawodnika.")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
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
          <CardTitle className="text-2xl">Rejestracja zawodnika</CardTitle>
          <CardDescription className="mt-1">Wypełnij swoje dane</CardDescription>
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
                  placeholder="Jan"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nazwisko *</Label>
                <Input
                  id="last_name"
                  placeholder="Kowalski"
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
                    <SelectValue placeholder="Wybierz poziom" />
                  </SelectTrigger>
                  <SelectContent className="w-[--radix-select-trigger-width]">
                    {SKILL_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jan@email.pl"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Hasło *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="min. 8 znaków"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-6">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Rejestracja..." : "Załóż konto zawodnika"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              <Link href="/register" className="underline underline-offset-4 hover:text-foreground">
                ← Wróć do wyboru konta
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
