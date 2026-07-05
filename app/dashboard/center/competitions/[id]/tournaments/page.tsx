import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getCompetitionTournaments } from "@/lib/actions/tournaments"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trophy } from "lucide-react"

export default async function TournamentsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/dashboard/center")

  const { data: competition } = await supabase
    .from("competitions")
    .select("id, name")
    .eq("id", competitionId)
    .eq("center_id", center.id)
    .single()
  if (!competition) notFound()

  const tournaments = await getCompetitionTournaments(competitionId)

  const statusLabel: Record<string, string> = {
    draft: "Szkic",
    active: "W toku",
    finished: "Zakończony",
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-muted-foreground mb-1">
          <Link href={`/dashboard/center/competitions/${competitionId}`} className="hover:underline">
            ← {competition.name}
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Turnieje</h1>
          <Button asChild size="sm">
            <Link href={`/dashboard/center/competitions/${competitionId}/tournaments/new`}>
              <Plus className="h-4 w-4 mr-1" /> Nowy turniej
            </Link>
          </Button>
        </div>
      </div>

      {(tournaments as any[]).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Brak turniejów. Utwórz pierwszy.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(tournaments as any[]).map((t) => (
            <Link key={t.id} href={`/dashboard/center/competitions/${competitionId}/tournaments/${t.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <Badge variant={t.status === "active" ? "default" : "secondary"}>
                      {statusLabel[t.status] ?? t.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.format === "single_elimination" ? "Puchar (single elimination)" : t.format}
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
