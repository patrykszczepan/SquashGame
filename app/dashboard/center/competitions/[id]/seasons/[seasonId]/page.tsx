import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trophy, ChevronRight, Users, Pencil } from "lucide-react"
import { ActivateSeasonButton } from "./ActivateSeasonButton"
import { CloseSeasonButton } from "./CloseSeasonButton"
import { ExternalLink } from "lucide-react"

export default async function SeasonDetailPage({
  params,
}: {
  params: Promise<{ id: string; seasonId: string }>
}) {
  const { id: competitionId, seasonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: center } = await supabase
    .from("centers")
    .select("id, slug")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/dashboard/center")

  const { data: season } = await supabase
    .from("seasons")
    .select(`
      *,
      competitions!inner(id, name, center_id, slug),
      leagues(
        id, name, level, round_robin_mode,
        league_players(count),
        rounds(count)
      )
    `)
    .eq("id", seasonId)
    .single()

  if (!season || season.competitions.center_id !== center.id) notFound()

  const leagues = ((season.leagues ?? []) as any[]).sort(
    (a: any, b: any) => a.level - b.level
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/dashboard/center/competitions" className="hover:underline">
            Rozgrywki
          </Link>
          <span>/</span>
          <Link
            href={`/dashboard/center/competitions/${competitionId}`}
            className="hover:underline"
          >
            {season.competitions.name}
          </Link>
          <span>/</span>
          <span>{season.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{season.name}</h1>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                season.status === "active"
                  ? "default"
                  : season.status === "finished"
                  ? "outline"
                  : "secondary"
              }
            >
              {season.status === "active"
                ? "Aktywny"
                : season.status === "finished"
                ? "Zakończony"
                : "Szkic"}
            </Badge>
            {season.status !== "finished" && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/center/competitions/${competitionId}/seasons/${seasonId}/edit`}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edytuj
                </Link>
              </Button>
            )}
            {season.status === "draft" && <ActivateSeasonButton seasonId={seasonId} />}
            {season.status === "active" && <CloseSeasonButton seasonId={seasonId} />}
            {center.slug && season.competitions.slug && (
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href={`/c/${center.slug}/${season.competitions.slug}/${seasonId}`}
                  target="_blank"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Strona publiczna
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Leagues */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ligi w sezonie</h2>
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/dashboard/center/competitions/${competitionId}/seasons/${seasonId}/leagues/new`}
            >
              <Plus className="h-4 w-4 mr-1" />
              Dodaj ligę
            </Link>
          </Button>
        </div>

        {leagues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Trophy className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="mb-4">Brak lig. Dodaj pierwszą ligę do sezonu.</p>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/center/competitions/${competitionId}/seasons/${seasonId}/leagues/new`}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj ligę
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {leagues.map((league: any) => {
              const playerCount = league.league_players?.[0]?.count ?? 0
              const hasSchedule = (league.rounds?.[0]?.count ?? 0) > 0

              return (
                <Link
                  key={league.id}
                  href={`/dashboard/center/competitions/${competitionId}/seasons/${seasonId}/leagues/${league.id}`}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                            {league.level}
                          </div>
                          <div>
                            <p className="font-medium">{league.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {league.round_robin_mode === "double"
                                ? "Każdy z każdym × 2"
                                : "Każdy z każdym × 1"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{playerCount}</span>
                          </div>
                          {hasSchedule && (
                            <Badge variant="secondary" className="text-xs">
                              Terminarz gotowy
                            </Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
