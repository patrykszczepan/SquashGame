import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Trophy, Users, ClipboardCheck, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function CenterDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: center } = await supabase
    .from("centers")
    .select("id, name, city")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/login")

  // Competitions IDs for this center
  const { data: comps } = await supabase
    .from("competitions")
    .select("id, name")
    .eq("center_id", center.id)
  const compIds = comps?.map((c) => c.id) ?? []
  const compMap = new Map(comps?.map((c) => [c.id, c]) ?? [])

  let leagueCount = 0
  let playerCount = 0
  let pendingCount = 0
  let activeLeagues: {
    id: string
    name: string
    level: number
    season_id: string
    seasonName: string
    competitionId: string
    competitionName: string
  }[] = []

  if (compIds.length > 0) {
    const [playersRes, activeSeasonsRes] = await Promise.all([
      supabase
        .from("competition_players")
        .select("id", { count: "exact", head: true })
        .in("competition_id", compIds)
        .eq("invitation_status", "accepted"),
      supabase
        .from("seasons")
        .select("id, name, competition_id")
        .in("competition_id", compIds)
        .eq("status", "active"),
    ])

    playerCount = playersRes.count ?? 0
    const activeSeasons = activeSeasonsRes.data ?? []
    const seasonIds = activeSeasons.map((s) => s.id)
    const seasonMap = new Map(activeSeasons.map((s) => [s.id, s]))

    if (seasonIds.length > 0) {
      const leaguesRes = await supabase
        .from("leagues")
        .select("id, name, level, season_id")
        .in("season_id", seasonIds)

      const rawLeagues = leaguesRes.data ?? []
      leagueCount = rawLeagues.length

      activeLeagues = rawLeagues.map((l) => {
        const season = seasonMap.get(l.season_id)
        const comp = compMap.get(season?.competition_id ?? "")
        return {
          id: l.id,
          name: l.name,
          level: l.level,
          season_id: l.season_id,
          seasonName: season?.name ?? "",
          competitionId: season?.competition_id ?? "",
          competitionName: comp?.name ?? "",
        }
      }).sort((a, b) => a.level - b.level)

      const leagueIds = rawLeagues.map((l) => l.id)
      if (leagueIds.length > 0) {
        const { data: rounds } = await supabase
          .from("rounds")
          .select("id")
          .in("league_id", leagueIds)
        const roundIds = rounds?.map((r) => r.id) ?? []
        if (roundIds.length > 0) {
          const { count } = await supabase
            .from("matches")
            .select("id", { count: "exact", head: true })
            .in("round_id", roundIds)
            .eq("status", "pending_confirmation")
          pendingCount = count ?? 0
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{center.name}</h1>
        {center.city && <p className="text-muted-foreground">{center.city}</p>}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktywne ligi
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{leagueCount}</p>
            <p className="text-xs text-muted-foreground">w bieżących sezonach</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zawodnicy
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{playerCount}</p>
            <p className="text-xs text-muted-foreground">zapisanych w rozgrywkach</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wyniki do zatwierdzenia
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${pendingCount > 0 ? "text-orange-500" : ""}`}>
              {pendingCount}
            </p>
            <p className="text-xs text-muted-foreground">mecze oczekujące</p>
          </CardContent>
        </Card>
      </div>

      {/* Active leagues */}
      {activeLeagues.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Aktywne ligi</h2>
          <div className="space-y-2">
            {activeLeagues.map((league) => (
              <Link
                key={league.id}
                href={`/dashboard/center/competitions/${league.competitionId}/seasons/${league.season_id}/leagues/${league.id}`}
                className="block"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                          {league.level}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{league.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {league.competitionName}
                            {league.seasonName ? ` · ${league.seasonName}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Aktywna</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {compIds.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="mb-2">Brak rozgrywek.</p>
            <Link
              href="/dashboard/center/competitions/new"
              className="text-sm text-primary hover:underline"
            >
              Utwórz pierwszą rozgrywkę →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
