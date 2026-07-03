"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2 } from "lucide-react"
import { completeCenterProfile } from "./actions"

interface Props {
  email: string
  initialName: string
}

export function CenterOnboardingForm({ email, initialName }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: initialName,
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
    const result = await completeCenterProfile(form)
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
              <Building2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Uzupełnij dane centrum</CardTitle>
          <CardDescription className="mt-1">{email}</CardDescription>
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
                  NIP <span className="text-xs text-muted-foreground">(opcjonalny)</span>
                </Label>
                <Input
                  id="nip"
                  placeholder="1234567890"
                  value={form.nip}
                  onChange={(e) => set("nip", e.target.value)}
                />
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
