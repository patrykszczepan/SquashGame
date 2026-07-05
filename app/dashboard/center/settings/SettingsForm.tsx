"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateCenterSettings } from "@/lib/actions/center"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2 } from "lucide-react"

interface Center {
  name: string
  slug: string | null
  description: string | null
  city: string | null
  address: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  nip: string | null
  num_courts: number | null
}

interface Props {
  center: Center
  publicBaseUrl: string
}

export function SettingsForm({ center, publicBaseUrl }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  const [name, setName] = useState(center.name)
  const [slug, setSlug] = useState(center.slug ?? "")
  const [description, setDescription] = useState(center.description ?? "")
  const [city, setCity] = useState(center.city ?? "")
  const [address, setAddress] = useState(center.address ?? "")
  const [postalCode, setPostalCode] = useState(center.postal_code ?? "")
  const [phone, setPhone] = useState(center.phone ?? "")
  const [email, setEmail] = useState(center.email ?? "")
  const [nip, setNip] = useState(center.nip ?? "")
  const [numCourts, setNumCourts] = useState(String(center.num_courts ?? 1))

  const slugPreview = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Nazwa centrum jest wymagana."); return }
    setLoading(true)
    setError("")
    setSaved(false)

    const result = await updateCenterSettings({
      name, slug, description, city, address, postal_code: postalCode, phone, email, nip,
      num_courts: Math.max(1, Number(numCourts) || 1),
    })

    setLoading(false)
    if (result.error) { setError(result.error); return }
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 4000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>Ustawienia zostały zapisane.</AlertDescription>
        </Alert>
      )}

      {/* Podstawowe dane */}
      <Card>
        <CardHeader>
          <CardTitle>Dane centrum</CardTitle>
          <CardDescription>Podstawowe informacje widoczne publicznie.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nazwa centrum <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Centrum Squasha XYZ"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Krótki opis centrum..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Adres */}
      <Card>
        <CardHeader>
          <CardTitle>Adres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="city">Miasto</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Warszawa"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-1">
              <Label htmlFor="postalCode">Kod pocztowy</Label>
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="00-000"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Ulica i numer</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ul. Sportowa 1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kontakt */}
      <Card>
        <CardHeader>
          <CardTitle>Dane kontaktowe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+48 123 456 789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail kontaktowy</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kontakt@centrum.pl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identyfikacja */}
      <Card>
        <CardHeader>
          <CardTitle>Identyfikacja</CardTitle>
          <CardDescription>Adres URL strony publicznej i dane firmowe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Adres URL centrum</Label>
            <div className="flex items-center gap-0">
              <span className="inline-flex items-center px-3 py-2 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm whitespace-nowrap">
                {publicBaseUrl}/c/
              </span>
              <Input
                id="slug"
                className="rounded-l-none"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="moje-centrum"
              />
            </div>
            {slug && slugPreview !== slug.trim() && (
              <p className="text-xs text-muted-foreground">
                Zostanie zapisany jako: <span className="font-mono font-medium">{slugPreview}</span>
              </p>
            )}
            {slugPreview && (
              <p className="text-xs text-muted-foreground">
                Publiczny adres:{" "}
                <span className="font-mono">{publicBaseUrl}/c/{slugPreview}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nip">
              NIP{" "}
              <Badge variant="outline" className="text-xs font-normal">opcjonalnie</Badge>
            </Label>
            <Input
              id="nip"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="000-000-00-00"
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Infrastruktura */}
      <Card>
        <CardHeader>
          <CardTitle>Infrastruktura</CardTitle>
          <CardDescription>Dane techniczne centrum używane przy planowaniu meczów.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="numCourts">Liczba kortów</Label>
            <Input
              id="numCourts"
              type="number"
              min={1}
              max={99}
              value={numCourts}
              onChange={(e) => setNumCourts(e.target.value.replace(/\D/g, "") || "1")}
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">
              Używane przy wpisywaniu wyników — numer kortu jest zapisywany do każdego meczu.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="pb-6">
        <Button type="submit" disabled={loading}>
          {loading ? "Zapisywanie..." : "Zapisz ustawienia"}
        </Button>
      </div>
    </form>
  )
}
