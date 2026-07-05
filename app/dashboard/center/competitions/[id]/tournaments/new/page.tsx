"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { createTournament } from "@/lib/actions/tournaments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function NewTournamentPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [name, setName] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Podaj nazwę turnieju."); return }
    setLoading(true)
    const result = await createTournament({
      competition_id: competitionId,
      name,
      format: "single_elimination",
      seeding_type: "manual",
    })
    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(`/dashboard/center/competitions/${competitionId}/tournaments/${result.id}`)
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <div className="text-sm text-muted-foreground mb-1">
          <Link href={`/dashboard/center/competitions/${competitionId}/tournaments`} className="hover:underline">
            ← Turnieje
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Nowy turniej</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ustawienia turnieju</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label>Nazwa turnieju *</Label>
              <Input
                placeholder="np. Turniej Wiosenny 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="border rounded-md px-3 py-2 text-sm bg-muted/30">
                Puchar (single elimination) — eliminacje bezpośrednie
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Tworzenie..." : "Utwórz turniej"}
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/center/competitions/${competitionId}/tournaments`}>Anuluj</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
