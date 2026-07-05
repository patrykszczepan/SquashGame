import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calculateTable } from "@/lib/scoring/engine"
import type { ScoringConfig, Match } from "@/lib/types"

export const revalidate = 60

export default async function PublicSeasonPage({
  params,
}: {
  params: Promise<{ centerSlug: string; competitionSlug: string; seasonId: string }>
}) {
  const { centerSlug, competitionSlug, seasonId } = await params
  const supabase = await createClient()

  // Verify center + competition + season chain
  const { data: center } = await supabase
    .from("centers")
    .select("id, name, slug")
    .eq("slug", centerSlug)
    .eq("is_active", true)
    .single()
  if (!center) notFound()

  const { data: competition } = await supabase
    .from("competitions")
    .select("id, name, slug, public_show_tables, public_show_schedule, public_show_contacts, public_short_names")
    .eq("center_id", center.id)
    .eq("slug", competitionSlug)
    .in("visibility", ["public", "mixed"])
    .single()
  if (!competition) notFound()

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name, status")
    .eq("id", seasonId)
    .eq("competition_id", competition.id)
    .single()
  if (!season) notFound()

  // Fetch leagues with full data
  const { data: leagues } = await supabase
    .from("leagues")
    .select(`
      id, name, level,
      scoring_configs(config),
      league_players(
        profile_id,
        promotion_status,
        position,
        players(first_name, last_name)
      ),
      rounds(
        id, name, number,
        matches(
          id, player_a_id, player_b_id, status, winner_id,
          match_sets(set_number, points_a, points_b)
        )
      )
    `)
    .eq("season_id", seasonId)
    .order("level", { ascending: true })

  const leagueList = (leagues ?? []) as any[]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1 flex-wrap">
            <Link href={`/c/${centerSlug}`} className="hover:underline">
              {center.name}
            </Link>
            <span>/</span>
            <span>{competition.name}</span>
            <span>/</span>
            <span>{season.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{season.name}</h1>
            <Badge variant={season.status === "active" ? "default" : "secondary"}>
              {season.status === "active" ? "Aktywny" : "Zakończony"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Leagues */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {leagueList.map((league) => {
          const lp = (league.league_players ?? []) as any[]
          const playerRefs = lp.map((p: any) => ({
            id: p.profile_id,
            name: competition.public_short_names
              ? `${p.players?.first_name?.[0] ?? ""}. ${p.players?.last_name ?? ""}`
              : `${p.players?.first_name ?? ""} ${p.players?.last_name ?? ""}`.trim(),
          }))

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

          const allMatches: Match[] = (league.rounds ?? []).flatMap(
            (r: any) => r.matches ?? []
          )
          const table = calculateTable(playerRefs, allMatches, scoringConfig)
          const rounds = ((league.rounds ?? []) as any[]).sort(
            (a, b) => a.number - b.number
          )

          // For promotion/demotion indicators
          const promotionMap: Record<string, string> = {}
          for (const p of lp) {
            if (p.promotion_status) promotionMap[p.profile_id] = p.promotion_status
          }

          return (
            <div key={league.id}>
              <h2 className="text-lg font-semibold mb-4">{league.name}</h2>
              <Tabs defaultValue={competition.public_show_tables ? "table" : "schedule"}>
                <TabsList className="mb-4">
                  {competition.public_show_tables && (
                    <TabsTrigger value="table">Tabela</TabsTrigger>
                  )}
                  {competition.public_show_schedule && (
                    <TabsTrigger value="schedule">Terminarz</TabsTrigger>
                  )}
                </TabsList>

                {competition.public_show_tables && (
                  <TabsContent value="table">
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
                              {season.status === "finished" && (
                                <th className="px-4 py-3 text-center w-8"></th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {table.map((row, idx) => {
                              const ps = promotionMap[row.profile_id]
                              return (
                                <tr
                                  key={row.profile_id}
                                  className="border-b last:border-0 hover:bg-muted/30"
                                >
                                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                  <td className="px-4 py-3 font-medium">
                                    <Link
                                      href={`/p/${row.profile_id}`}
                                      className="hover:underline"
                                    >
                                      {row.player_name}
                                    </Link>
                                  </td>
                                  <td className="px-4 py-3 text-center text-muted-foreground">{row.played}</td>
                                  <td className="px-4 py-3 text-center text-muted-foreground">{row.won}</td>
                                  <td className="px-4 py-3 text-center text-muted-foreground">{row.lost}</td>
                                  <td className="px-4 py-3 text-center text-muted-foreground">
                                    {row.sets_won}:{row.sets_lost}
                                  </td>
                                  <td className="px-4 py-3 text-center font-bold">{row.points}</td>
                                  {season.status === "finished" && (
                                    <td className="px-4 py-3 text-center">
                                      {ps === "promoted" && (
                                        <span className="text-green-600 text-xs font-semibold">▲</span>
                                      )}
                                      {ps === "demoted" && (
                                        <span className="text-red-600 text-xs font-semibold">▼</span>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </TabsContent>
                )}

                {competition.public_show_schedule && (
                  <TabsContent value="schedule" className="space-y-3">
                    {rounds.map((round: any) => (
                      <Card key={round.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{round.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          {(round.matches ?? []).map((m: any) => {
                            const nameA = playerRefs.find((p) => p.id === m.player_a_id)?.name ?? "?"
                            const nameB = playerRefs.find((p) => p.id === m.player_b_id)?.name ?? "?"
                            const sA = (m.match_sets ?? []).filter(
                              (s: any) => s.points_a > s.points_b
                            ).length
                            const sB = (m.match_sets ?? []).filter(
                              (s: any) => s.points_b > s.points_a
                            ).length
                            const done = m.status === "finished" || m.status === "walkover"
                            return (
                              <div
                                key={m.id}
                                className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/30"
                              >
                                <span className={m.winner_id === m.player_a_id && done ? "font-semibold" : ""}>
                                  {nameA}
                                </span>
                                <span className="text-muted-foreground mx-2 tabular-nums">
                                  {done ? `${sA}:${sB}` : "–"}
                                </span>
                                <span className={m.winner_id === m.player_b_id && done ? "font-semibold" : ""}>
                                  {nameB}
                                </span>
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )
        })}
      </div>

      <div className="text-center py-6 text-xs text-muted-foreground border-t">
        Platforma{" "}
        <Link href="/" className="underline underline-offset-2">
          SquashLeague
        </Link>
      </div>
    </div>
  )
}
