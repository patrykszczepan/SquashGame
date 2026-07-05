"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSeason } from "@/lib/actions/competitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { use } from "react"

export default function NewSeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "" })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Podaj nazwę sezonu."); return }
    setLoading(true)
    const result = await createSeason({
      competition_id: competitionId,
      name: form.name,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    })
    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(`/dashboard/center/competitions/${competitionId}/seasons/${result.id}`)
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <div className="text-sm text-muted-foreground mb-1">
          <Link href={`/dashboard/center/competitions/${competitionId}`} className="hover:underline">
            ← Rozgrywki
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Nowy sezon</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dane sezonu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa sezonu <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="np. Sezon 2 — lato 2026"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data rozpoczęcia</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => set("start_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Data zakończenia</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => set("end_date", e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Tworzenie..." : "Utwórz sezon"}
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/center/competitions/${competitionId}`}>Anuluj</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
