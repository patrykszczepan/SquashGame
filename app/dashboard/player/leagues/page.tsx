import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Calendar } from "lucide-react"

export default async function PlayerLeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: leaguePlayers } = await supabase
    .from("league_players")
    .select(`
      id, position,
      leagues(
        id, name, level,
        seasons(
          id, name, status,
          competitions(id, name, centers(name))
        )
      )
    `)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })

  const entries = (leaguePlayers ?? []) as any[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moje ligi</h1>
        <p className="text-muted-foreground">Rozgrywki, w których uczestniczysz.</p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Trophy className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nie bierzesz jeszcze udziału w żadnych ligach.</p>
            <p className="text-sm text-muted-foreground">
              Poproś organizatora o link zaproszenia do rozgrywek.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {entries.map((lp) => {
            const league = lp.leagues
            const season = league?.seasons
            const competition = season?.competitions
            const center = competition?.centers
            const isActive = season?.status === "active"
            return (
              <Card key={lp.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{league?.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {competition?.name} · {season?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{center?.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-xs">
                        Liga {league?.level}
                      </Badge>
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {season?.status === "active"
                          ? "Aktywny"
                          : season?.status === "draft"
                          ? "Przygotowania"
                          : "Zakończony"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/player/matches">
                      <Calendar className="h-3 w-3 mr-1" />
                      Moje mecze
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
