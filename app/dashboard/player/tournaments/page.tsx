import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getMyTournaments } from "@/lib/actions/tournaments"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy } from "lucide-react"

export default async function PlayerTournamentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const entries = await getMyTournaments() as any[]

  const statusLabel: Record<string, string> = {
    draft: "Szkic",
    active: "W toku",
    finished: "Zakończony",
  }

  // Deduplicate by tournament_id
  const seen = new Set<string>()
  const unique = entries.filter((e) => {
    const t = e.tournaments as any
    if (!t || seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moje turnieje</h1>
        <p className="text-muted-foreground">Turnieje, w których uczestniczysz.</p>
      </div>

      {unique.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Trophy className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nie bierzesz udziału w żadnych turniejach.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {unique.map((e) => {
            const t = e.tournaments as any
            const comp = t?.competitions as any
            return (
              <Card key={t.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {comp?.name} · {comp?.centers?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.format === "single_elimination" ? "Puchar" : t.format}
                    </p>
                  </div>
                  <Badge variant={t.status === "active" ? "default" : "secondary"}>
                    {statusLabel[t.status] ?? t.status}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
