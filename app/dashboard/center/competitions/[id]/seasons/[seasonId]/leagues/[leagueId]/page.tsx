import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calculateTable } from "@/lib/scoring/engine"
import type { ScoringConfig, Match } from "@/lib/types"
import { LeaguePlayersPanel } from "./LeaguePlayersPanel"
import { GenerateScheduleButton } from "./GenerateScheduleButton"

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string; seasonId: string; leagueId: string }>
}) {
  const { id: competitionId, seasonId, leagueId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/dashboard/center")

  // Fetch league with all related data
  const { data: league } = await supabase
    .from("leagues")
    .select(`
      *,
      seasons!inner(id, name, competition_id, competitions!inner(id, name, center_id)),
      scoring_configs(config),
      league_players(
        id, profile_id, position,
        players(first_name, last_name)
      ),
      rounds(
        id, name, number, deadline,
        matches(
          id, player_a_id, player_b_id, status, winner_id,
          walkover_for_id, result_source, submitted_by,
          match_sets(set_number, points_a, points_b)
        )
      )
    `)
    .eq("id", leagueId)
    .single()

  if (!league || league.seasons.competitions.center_id !== center.id) notFound()

  // Fetch competition players not yet in this league (for assignment)
  const { data: compPlayers } = await supabase
    .from("competition_players")
    .select("profile_id, players!inner(first_name, last_name)")
    .eq("competition_id", league.seasons.competition_id)
    .eq("invitation_status", "accepted")

  const leaguePlayerIds = new Set(
    (league.league_players ?? []).map((lp: any) => lp.profile_id)
  )

  const availablePlayers = (compPlayers ?? []).filter(
    (cp: any) => !leaguePlayerIds.has(cp.profile_id)
  )

  // Flatten matches from all rounds
  const allMatches: Match[] = (league.rounds ?? []).flatMap(
    (r: any) => r.matches ?? []
  )
  const hasSchedule = allMatches.length > 0

  // Calculate table
  const scoringConfig: ScoringConfig =
    league.scoring_configs?.config ?? {
      win_by_sets: { "3:0": 5, "3:1": 4, "3:2": 3 },
      loss_by_sets: { "0:3": 0, "1:3": 1, "2:3": 2 },
      set_point: { enabled: false, value: 0 },
      participation_point: { enabled: false, value: 0 },
      walkover: { winner: 5, loser: 0 },
      not_played: { a: 0, b: 0 },
      tiebreaker: ["points", "head_to_head", "set_ratio", "small_points", "matches_played"],
    }

  const leaguePlayers = (league.league_players ?? []) as any[]
  const playerRefs = leaguePlayers.map((lp: any) => ({
    id: lp.profile_id,
    name: `${lp.players?.first_name ?? ""} ${lp.players?.last_name ?? ""}`.trim(),
  }))

  const table = calculateTable(playerRefs, allMatches, scoringConfig)

  const rounds = ((league.rounds ?? []) as any[]).sort(
    (a: any, b: any) => a.number - b.number
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1 flex-wrap">
          <Link href="/dashboard/center/competitions" className="hover:underline">Rozgrywki</Link>
          <span>/</span>
          <Link href={`/dashboard/center/competitions/${competitionId}`} className="hover:underline">
            {league.seasons.competitions.name}
          </Link>
          <span>/</span>
          <Link href={`/dashboard/center/competitions/${competitionId}/seasons/${seasonId}`} className="hover:underline">
            {league.seasons.name}
          </Link>
          <span>/</span>
          <span>{league.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <Badge variant="outline">Liga {league.level}</Badge>
        </div>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Tabela</TabsTrigger>
          <TabsTrigger value="schedule">Terminarz</TabsTrigger>
          <TabsTrigger value="players">Zawodnicy</TabsTrigger>
        </TabsList>

        {/* TABLE */}
        <TabsContent value="table" className="space-y-4">
          {table.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Brak zawodników w lidze.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left w-8">#</th>
                      <th className="px-4 py-3 text-left">Zawodnik</th>
                      <th className="px-4 py-3 text-center">M</th>
                      <th className="px-4 py-3 text-center">W</th>
                      <th className="px-4 py-3 text-center">P</th>
                      <th className="px-4 py-3 text-center">Sety</th>
                      <th className="px-4 py-3 text-center font-bold">Pkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((row, idx) => (
                      <tr
                        key={row.profile_id}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{row.player_name}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{row.played}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{row.won}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{row.lost}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {row.sets_won}:{row.sets_lost}
                        </td>
                        <td className="px-4 py-3 text-center font-bold">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* SCHEDULE */}
        <TabsContent value="schedule" className="space-y-4">
          {!hasSchedule && leaguePlayers.length >= 2 && (
            <Card>
              <CardContent className="py-8 text-center space-y-4">
                <p className="text-muted-foreground">
                  Terminarz nie został jeszcze wygenerowany.
                </p>
                <GenerateScheduleButton leagueId={leagueId} />
              </CardContent>
            </Card>
          )}
          {!hasSchedule && leaguePlayers.length < 2 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Dodaj co najmniej 2 zawodników, aby wygenerować terminarz.
              </CardContent>
            </Card>
          )}
          {rounds.map((round: any) => (
            <Card key={round.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {round.name}
                  {round.deadline && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      do {new Date(round.deadline).toLocaleDateString("pl")}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(round.matches ?? []).map((m: any) => {
                  const playerA = leaguePlayers.find((lp: any) => lp.profile_id === m.player_a_id)
                  const playerB = leaguePlayers.find((lp: any) => lp.profile_id === m.player_b_id)
                  const nameA = playerA
                    ? `${playerA.players?.first_name} ${playerA.players?.last_name}`
                    : "?"
                  const nameB = playerB
                    ? `${playerB.players?.first_name} ${playerB.players?.last_name}`
                    : "?"

                  const scoreA = (m.match_sets ?? []).filter(
                    (s: any) => s.points_a > s.points_b
                  ).length
                  const scoreB = (m.match_sets ?? []).filter(
                    (s: any) => s.points_b > s.points_a
                  ).length

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between py-2 px-3 rounded-md border text-sm"
                    >
                      <span className={m.winner_id === m.player_a_id ? "font-semibold" : ""}>
                        {nameA}
                      </span>
                      <span className="text-muted-foreground mx-3">
                        {m.status === "finished" || m.status === "walkover"
                          ? `${scoreA}:${scoreB}`
                          : m.status === "pending_confirmation"
                          ? "⏳"
                          : "–"}
                      </span>
                      <span className={m.winner_id === m.player_b_id ? "font-semibold" : ""}>
                        {nameB}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* PLAYERS */}
        <TabsContent value="players">
          <LeaguePlayersPanel
            leagueId={leagueId}
            leaguePlayers={leaguePlayers}
            availablePlayers={availablePlayers as any[]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
