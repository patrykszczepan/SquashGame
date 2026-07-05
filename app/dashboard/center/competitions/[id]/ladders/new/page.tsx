"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { createLadder } from "@/lib/actions/ladders"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function NewLadderPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    max_challenge_distance: "2",
    challenge_deadline_days: "7",
    protection_days: "3",
  })

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Podaj nazwę."); return }
    setLoading(true)
    const result = await createLadder({
      competition_id: competitionId,
      name: form.name,
      max_challenge_distance: parseInt(form.max_challenge_distance) || 2,
      challenge_deadline_days: parseInt(form.challenge_deadline_days) || 7,
      protection_days: parseInt(form.protection_days) || 3,
    })
    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(`/dashboard/center/competitions/${competitionId}/ladders/${result.id}`)
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <div className="text-sm text-muted-foreground mb-1">
          <Link href={`/dashboard/center/competitions/${competitionId}/ladders`} className="hover:underline">
            ← Drabinki
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Nowa drabinka challenge</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Ustawienia drabinki</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label>Nazwa *</Label>
              <Input
                placeholder="np. Drabinka Wiosenna 2026"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Max odległość</Label>
                <Input
                  type="number" min="1" max="10"
                  value={form.max_challenge_distance}
                  onChange={(e) => set("max_challenge_distance", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Deadline (dni)</Label>
                <Input
                  type="number" min="1"
                  value={form.challenge_deadline_days}
                  onChange={(e) => set("challenge_deadline_days", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ochrona (dni)</Label>
                <Input
                  type="number" min="0"
                  value={form.protection_days}
                  onChange={(e) => set("protection_days", e.target.value)}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
              <strong>Max odległość:</strong> ile pozycji wyżej można wyzwać<br/>
              <strong>Deadline:</strong> ile dni na rozegranie meczu po wyzwaniu<br/>
              <strong>Ochrona:</strong> ile dni ochrony po wygranym meczu
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Tworzenie..." : "Utwórz drabinkę"}
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/center/competitions/${competitionId}/ladders`}>Anuluj</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
