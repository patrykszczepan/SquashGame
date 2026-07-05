"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { createLeague } from "@/lib/actions/competitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"

export default function NewLeaguePage({
  params,
}: {
  params: Promise<{ id: string; seasonId: string }>
}) {
  const { id: competitionId, seasonId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    level: "1",
    round_robin_mode: "single",
    promotions: "2",
    demotions: "2",
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Podaj nazwę ligi."); return }
    setLoading(true)
    const result = await createLeague({
      season_id: seasonId,
      name: form.name,
      level: parseInt(form.level, 10),
      round_robin_mode: form.round_robin_mode as "single" | "double",
      promotions: parseInt(form.promotions, 10) || undefined,
      demotions: parseInt(form.demotions, 10) || undefined,
    })
    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(
      `/dashboard/center/competitions/${competitionId}/seasons/${seasonId}/leagues/${result.id}`
    )
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <div className="text-sm text-muted-foreground mb-1">
          <Link
            href={`/dashboard/center/competitions/${competitionId}/seasons/${seasonId}`}
            className="hover:underline"
          >
            ← Sezon
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Nowa liga</h1>
        <p className="text-muted-foreground">Wartości domyślne zgodne z spec — zmienisz je później.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ustawienia ligi</CardTitle>
          <CardDescription>
            Punktacja: szablon "Standard" (3:0=5, 3:1=4, 3:2=3, 2:3=2, 1:3=1, 0:3=0).
            Format meczu: best-of-5.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nazwa ligi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="np. Liga 1"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="level">Poziom (1 = najwyższy)</Label>
                <Input
                  id="level"
                  type="number"
                  min="1"
                  value={form.level}
                  onChange={(e) => set("level", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="round_robin_mode">Tryb rozgrywania</Label>
                <Select
                  value={form.round_robin_mode}
                  onValueChange={(v) => set("round_robin_mode", v)}
                >
                  <SelectTrigger id="round_robin_mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Każdy z każdym × 1</SelectItem>
                    <SelectItem value="double">Każdy z każdym × 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="promotions">Awanse (miejsc)</Label>
                <Input
                  id="promotions"
                  type="number"
                  min="0"
                  value={form.promotions}
                  onChange={(e) => set("promotions", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demotions">Spadki (miejsc)</Label>
                <Input
                  id="demotions"
                  type="number"
                  min="0"
                  value={form.demotions}
                  onChange={(e) => set("demotions", e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Tworzenie..." : "Utwórz ligę"}
              </Button>
              <Button variant="outline" asChild>
                <Link
                  href={`/dashboard/center/competitions/${competitionId}/seasons/${seasonId}`}
                >
                  Anuluj
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
