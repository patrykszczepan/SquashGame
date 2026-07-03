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
import { Building2 } from "lucide-react"

export default function RegisterCenterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    address: "",
    postal_code: "",
    city: "",
    phone: "",
    nip: "",
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
      .insert({ id: userId, role: "center" })

    if (profileError) {
      setError("Błąd tworzenia profilu.")
      setLoading(false)
      return
    }

    const { error: centerError } = await supabase
      .from("centers")
      .insert({
        profile_id: userId,
        name: form.name,
        address: form.address || null,
        postal_code: form.postal_code || null,
        city: form.city || null,
        phone: form.phone || null,
        nip: form.nip || null,
      })

    if (centerError) {
      setError("Błąd tworzenia centrum.")
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
              <Building2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Rejestracja centrum</CardTitle>
          <CardDescription className="mt-1">Wypełnij dane swojego centrum squash</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa centrum *</Label>
              <Input
                id="name"
                placeholder="np. Centrum Squash Lublin"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                placeholder="ul. Przykładowa 1"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Kod pocztowy</Label>
                <Input
                  id="postal_code"
                  placeholder="20-001"
                  value={form.postal_code}
                  onChange={(e) => set("postal_code", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Miasto</Label>
                <Input
                  id="city"
                  placeholder="Lublin"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
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
                <Label htmlFor="nip">
                  NIP{" "}
                  <span className="text-xs text-muted-foreground">(opcjonalny)</span>
                </Label>
                <Input
                  id="nip"
                  placeholder="1234567890"
                  value={form.nip}
                  onChange={(e) => set("nip", e.target.value)}
                />
              </div>
            </div>
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="centrum@email.pl"
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
              {loading ? "Rejestracja..." : "Załóż konto centrum"}
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
