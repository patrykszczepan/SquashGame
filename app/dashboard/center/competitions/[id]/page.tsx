import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Plus, Users, Link2, ChevronRight, Trophy, Swords } from "lucide-react"
import { getCompetitionPlayers, getCompetitionInvitations } from "@/lib/actions/competitions"
import { CreateInvitationButton } from "./CreateInvitationButton"
import { CompetitionActions } from "./CompetitionActions"
import { AssignCompetitionPlayerDialog } from "./AssignCompetitionPlayerDialog"

const seasonStatusBadge: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  finished: "outline",
}
const seasonStatusLabel: Record<string, string> = {
  active: "Aktywny",
  draft: "Szkic",
  finished: "Zakończony",
}

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const t = await getTranslations("competitions")

  // Fetch competition with seasons
  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/dashboard/center")

  const { data: comp } = await supabase
    .from("competitions")
    .select("*, seasons(id, name, status, start_date, end_date, leagues(id, name, level))")
    .eq("id", id)
    .eq("center_id", center.id)
    .single()
  if (!comp) notFound()

  const [players, invitations, tournamentsData, laddersData] = await Promise.all([
    getCompetitionPlayers(id),
    getCompetitionInvitations(id),
    supabase.from("tournaments").select("id, name, status, format").eq("competition_id", id),
    supabase.from("ladders").select("id, name").eq("competition_id", id),
  ])
  const tournaments = tournamentsData.data ?? []
  const ladders = laddersData.data ?? []
  const seasons = (comp.seasons ?? []).sort((a: any, b: any) => a.status.localeCompare(b.status))

  // Build league_id -> league name map from comp.seasons data
  const leagueNameMap: Record<string, string> = {}
  for (const s of comp.seasons ?? []) {
    for (const l of s.leagues ?? []) {
      leagueNameMap[l.id] = l.name
    }
  }

  // Fetch league assignments for players in this competition
  const allLeagueIds = Object.keys(leagueNameMap)
  const playerLeagueMap: Record<string, string> = {}
  if (allLeagueIds.length > 0) {
    const { data: lpData } = await supabase
      .from("league_players")
      .select("profile_id, league_id")
      .in("league_id", allLeagueIds)
    for (const lp of lpData ?? []) {
      if (lp.profile_id) playerLeagueMap[lp.profile_id] = leagueNameMap[lp.league_id] ?? ""
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/dashboard/center/competitions" className="hover:underline">
              {t("title")}
            </Link>
            <span>/</span>
            <span>{comp.name}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{comp.name}</h1>
            <Badge variant={comp.visibility === "public" ? "default" : "secondary"}>
              {t(`visibility.${comp.visibility}`)}
            </Badge>
            {comp.is_archived && (
              <Badge variant="outline">Zarchiwizowane</Badge>
            )}
          </div>
          {comp.description && (
            <p className="text-muted-foreground mt-1">{comp.description}</p>
          )}
        </div>
        <CompetitionActions
          competitionId={id}
          competitionName={comp.name}
          isArchived={comp.is_archived ?? false}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: seasons + tournaments + ladders */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tournaments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Turnieje ({tournaments.length})
              </h2>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/center/competitions/${id}/tournaments/new`}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nowy turniej
                </Link>
              </Button>
            </div>
            {tournaments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak turniejów w tych rozgrywkach.</p>
            ) : (
              <div className="space-y-2">
                {tournaments.map((t: any) => (
                  <Link key={t.id} href={`/dashboard/center/competitions/${id}/tournaments/${t.id}`} className="block">
                    <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                      <CardContent className="py-3 flex items-center justify-between">
                        <span className="text-sm font-medium">{t.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={t.status === "active" ? "default" : "secondary"} className="text-xs">
                            {t.status === "draft" ? "Szkic" : t.status === "active" ? "W toku" : "Zakończony"}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Ladders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Swords className="h-4 w-4" />
                Drabinki challenge ({ladders.length})
              </h2>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/center/competitions/${id}/ladders/new`}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nowa drabinka
                </Link>
              </Button>
            </div>
            {ladders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak drabinek challenge.</p>
            ) : (
              <div className="space-y-2">
                {ladders.map((l: any) => (
                  <Link key={l.id} href={`/dashboard/center/competitions/${id}/ladders/${l.id}`} className="block">
                    <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                      <CardContent className="py-3 flex items-center justify-between">
                        <span className="text-sm font-medium">{l.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Seasons */}
          <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("seasons.title")}</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/center/competitions/${id}/seasons/new`}>
                <Plus className="h-4 w-4 mr-1" />
                {t("seasons.new")}
              </Link>
            </Button>
          </div>

          {seasons.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <p>{t("seasons.empty")}</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href={`/dashboard/center/competitions/${id}/seasons/new`}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("seasons.new")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {seasons.map((season: any) => (
                <Link
                  key={season.id}
                  href={`/dashboard/center/competitions/${id}/seasons/${season.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Trophy className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{season.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(season.leagues ?? []).length} lig
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={seasonStatusBadge[season.status]}>
                            {seasonStatusLabel[season.status]}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          </div>{/* /seasons */}
        </div>{/* /lg:col-span-2 */}

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Invitations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                {t("invitations.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CreateInvitationButton competitionId={id} />
              <Separator />
              {invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("invitations.empty")}</p>
              ) : (
                <div className="space-y-2">
                  {invitations.slice(0, 3).map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between text-sm">
                      <code className="text-xs bg-muted px-1 rounded">{inv.code}</code>
                      <span className="text-xs text-muted-foreground">{inv.use_count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Players table — full width */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("players.title")} ({players.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("players.empty")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium w-8">#</th>
                  <th className="px-4 py-3 text-left font-medium">Imię</th>
                  <th className="px-4 py-3 text-left font-medium">Nazwisko</th>
                  <th className="px-4 py-3 text-left font-medium">Liga</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {players.map((cp: any, idx: number) => {
                  const firstName = cp.players?.first_name ?? "—"
                  const lastName = cp.players?.last_name || "—"
                  const leagueName = playerLeagueMap[cp.profile_id] ?? null
                  const playerName = `${firstName} ${lastName}`.trim()
                  return (
                    <tr key={cp.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{firstName}</td>
                      <td className="px-4 py-3">{lastName}</td>
                      <td className="px-4 py-3">
                        {leagueName
                          ? <Badge variant="secondary" className="text-xs font-normal">{leagueName}</Badge>
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={cp.invitation_status === "accepted" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {cp.invitation_status === "accepted" ? "Aktywny" : "Zaproszony"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {cp.profile_id && (
                          <AssignCompetitionPlayerDialog
                            profileId={cp.profile_id}
                            playerName={playerName}
                            seasons={seasons.map((s: any) => ({
                              id: s.id,
                              name: s.name,
                              status: s.status,
                              leagues: s.leagues ?? [],
                            }))}
                            currentLeagueName={leagueName ?? undefined}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
