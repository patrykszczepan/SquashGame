import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { calculateTable } from "@/lib/scoring/engine"
import type { ScoringConfig, Match } from "@/lib/types"
import { cn } from "@/lib/utils"

export const revalidate = 60

function shortName(first: string, last: string): string {
  if (!first && !last) return "?"
  return last ? `${first} ${last[0]}.` : first
}

export default async function PublicSeasonPage({
  params,
}: {
  params: Promise<{ centerSlug: string; competitionSlug: string; seasonId: string }>
}) {
  const { centerSlug, competitionSlug, seasonId } = await params
  const supabase = await createClient()

  const { data: center } = await supabase
    .from("centers")
    .select("id, name, slug")
    .eq("slug", centerSlug)
    .eq("is_active", true)
    .single()
  if (!center) notFound()

  const { data: competition } = await supabase
    .from("competitions")
    .select("id, name, slug")
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

  // Fetch leagues — basic info only, no nested joins
  const { data: leaguesRaw } = await supabase
    .from("leagues")
    .select("id, name, level, promotions, demotions")
    .eq("season_id", seasonId)
    .order("level", { ascending: true })
  const leagueList = leaguesRaw ?? []
  const leagueIds = leagueList.map((l) => l.id)

  if (leagueIds.length === 0) {
    return <EmptyPage center={center} competition={competition} season={season} centerSlug={centerSlug} />
  }

  // Separate queries — avoid PostgREST join failures on new FK columns
  const [lpRes, scoringRes, roundsRes] = await Promise.all([
    supabase
      .from("league_players")
      .select("league_id, profile_id, center_player_id, promotion_status")
      .in("league_id", leagueIds),
    supabase
      .from("scoring_configs")
      .select("league_id, config")
      .in("league_id", leagueIds),
    supabase
      .from("rounds")
      .select(`id, name, number, league_id, matches(id, player_a_id, player_b_id, status, winner_id, match_sets(set_number, points_a, points_b))`)
      .in("league_id", leagueIds)
      .order("number"),
  ])

  const allLp = lpRes.data ?? []
  const profileIds = allLp.map((lp) => lp.profile_id).filter(Boolean) as string[]
  const centerPlayerIds = allLp.map((lp) => lp.center_player_id).filter(Boolean) as string[]

  const [playersRes, centerPlayersRes] = await Promise.all([
    profileIds.length > 0
      ? supabase.from("players").select("profile_id, first_name, last_name").in("profile_id", profileIds)
      : Promise.resolve({ data: [] as { profile_id: string; first_name: string; last_name: string }[] }),
    centerPlayerIds.length > 0
      ? supabase.from("center_players").select("id, first_name, last_name").in("id", centerPlayerIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
  ])

  const playerNameMap = new Map((playersRes.data ?? []).map((p) => [p.profile_id, p]))
  const centerPlayerMap = new Map((centerPlayersRes.data ?? []).map((p) => [p.id, p]))
  const scoringMap = new Map((scoringRes.data ?? []).map((s) => [s.league_id, s.config as ScoringConfig]))
  const roundsByLeague = new Map<string, any[]>()
  for (const r of roundsRes.data ?? []) {
    if (!roundsByLeague.has(r.league_id)) roundsByLeague.set(r.league_id, [])
    roundsByLeague.get(r.league_id)!.push(r)
  }

  const defaultScoringConfig: ScoringConfig = {
    win_by_sets: { "3:0": 5, "3:1": 4, "3:2": 3 },
    loss_by_sets: { "0:3": 0, "1:3": 1, "2:3": 2 },
    set_point: { enabled: false, value: 0 },
    participation_point: { enabled: false, value: 0 },
    walkover: { winner: 5, loser: 0 },
    not_played: { a: 0, b: 0 },
    tiebreaker: ["points", "head_to_head", "set_ratio", "small_points", "matches_played"],
  }

  // Pre-compute per-league data for summary blocks + detail sections
  const leagueData = leagueList.map((league) => {
    const lp = allLp.filter((p) => p.league_id === league.id)
    const playerRefs = lp.map((p) => {
      const id = p.profile_id ?? p.center_player_id
      const reg = p.profile_id ? playerNameMap.get(p.profile_id) : null
      const guest = p.center_player_id ? centerPlayerMap.get(p.center_player_id) : null
      const first = reg?.first_name ?? guest?.first_name ?? ""
      const last = reg?.last_name ?? guest?.last_name ?? ""
      return { id, name: shortName(first, last) }
    })
    const scoringConfig = scoringMap.get(league.id) ?? defaultScoringConfig
    const rounds = (roundsByLeague.get(league.id) ?? []).sort((a: any, b: any) => a.number - b.number)
    const allMatches: Match[] = rounds.flatMap((r: any) => r.matches ?? [])
    const table = calculateTable(playerRefs, allMatches, scoringConfig)
    const totalMatches = allMatches.length
    const playedMatches = allMatches.filter(
      (m: any) => m.status === "finished" || m.status === "walkover"
    ).length
    const pct = totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0
    const pendingMatches = allMatches.filter(
      (m: any) => m.status === "scheduled" || m.status === "postponed"
    ) as any[]
    return {
      league,
      playerRefs,
      scoringConfig,
      rounds,
      allMatches,
      table,
      totalMatches,
      playedMatches,
      pct,
      pendingMatches,
    }
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1 flex-wrap">
            <Link href={`/c/${centerSlug}`} className="hover:underline">{center.name}</Link>
            <span>/</span>
            <span>{competition.name}</span>
            <span>/</span>
            <span>{season.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{season.name}</h1>
            <Badge variant={season.status === "active" ? "default" : "secondary"}>
              {season.status === "active" ? "Aktywny" : "Zakończony"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress summary blocks */}
      {leagueData.some((d) => d.totalMatches > 0) && (
        <div className="border-b bg-muted/30">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className={cn(
              "grid gap-3",
              leagueData.length === 1 ? "grid-cols-1" :
              leagueData.length === 2 ? "grid-cols-2" :
              leagueData.length === 3 ? "grid-cols-3" :
              "grid-cols-2 sm:grid-cols-4"
            )}>
              {leagueData.map(({ league, totalMatches, playedMatches, pct }) => (
                <div key={league.id} className="bg-card rounded-xl border px-4 py-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground truncate">{league.name}</div>
                  <div className="flex items-end gap-2">
                    <span className={cn(
                      "text-3xl font-bold tabular-nums leading-none",
                      pct === 100 ? "text-green-600 dark:text-green-400" : "text-foreground"
                    )}>
                      {pct}<span className="text-lg font-semibold">%</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", pct === 100 ? "bg-green-500" : "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {playedMatches} / {totalMatches} meczów
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {leagueData.map(({ league, playerRefs, rounds, allMatches, table, totalMatches, playedMatches, pct, pendingMatches }, leagueIdx) => {
          const promotions = league.promotions ?? 0
          const demotions = league.demotions ?? 0

          return (
            <details key={league.id} open={leagueIdx === 0} className="group border rounded-xl bg-card shadow-sm">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none hover:bg-muted/30 rounded-xl group-open:rounded-b-none group-open:border-b">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{league.name}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {playerRefs.length} zawodników
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {totalMatches > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {playedMatches}/{totalMatches} meczów
                    </span>
                  )}
                  <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </summary>

              <div className="px-5 py-4 space-y-6">

                {/* Tabela */}
                {table.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tabela</h3>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-3 py-2.5 text-left w-7 text-muted-foreground font-medium">#</th>
                            <th className="px-3 py-2.5 text-left font-medium">Zawodnik</th>
                            <th className="px-3 py-2.5 text-center text-muted-foreground font-medium">M</th>
                            <th className="px-3 py-2.5 text-center text-muted-foreground font-medium">W</th>
                            <th className="px-3 py-2.5 text-center text-muted-foreground font-medium">P</th>
                            <th className="px-3 py-2.5 text-center text-muted-foreground font-medium">Sety</th>
                            <th className="px-3 py-2.5 text-center font-bold">Pkt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.map((row, idx) => {
                            const isPromotion = promotions > 0 && idx < promotions
                            const isDemotion = demotions > 0 && idx >= table.length - demotions
                            return (
                              <tr key={row.profile_id} className={cn(
                                "border-b last:border-0",
                                isPromotion && "bg-green-50 dark:bg-green-950/30",
                                isDemotion && "bg-red-50 dark:bg-red-950/30",
                                !isPromotion && !isDemotion && "hover:bg-muted/20"
                              )}>
                                <td className="px-3 py-2.5 text-muted-foreground">{idx + 1}</td>
                                <td className="px-3 py-2.5 font-medium">{row.player_name}</td>
                                <td className="px-3 py-2.5 text-center text-muted-foreground">{row.played}</td>
                                <td className="px-3 py-2.5 text-center text-muted-foreground">{row.won}</td>
                                <td className="px-3 py-2.5 text-center text-muted-foreground">{row.lost}</td>
                                <td className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">{row.sets_won}:{row.sets_lost}</td>
                                <td className="px-3 py-2.5 text-center font-bold">{row.points}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Wyniki */}
                {table.length > 1 && playedMatches > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Wyniki</h3>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="text-sm border-collapse w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[8rem]">Zawodnik</th>
                            {table.map((_, j) => (
                              <th key={j} className="px-2 py-2.5 text-center font-semibold w-12">{j + 1}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.map((rowPlayer, i) => (
                            <tr key={rowPlayer.profile_id} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="px-3 py-2 font-medium whitespace-nowrap">
                                <span className="text-muted-foreground mr-1.5 tabular-nums text-xs">{i + 1}.</span>
                                {rowPlayer.player_name}
                              </td>
                              {table.map((colPlayer, j) => {
                                if (i === j) return <td key={j} className="bg-muted/40" />
                                const match = (allMatches as any[]).find((m: any) =>
                                  m.player_a_id === rowPlayer.profile_id &&
                                  m.player_b_id === colPlayer.profile_id
                                )
                                if (!match || (match.status !== "finished" && match.status !== "walkover")) {
                                  return <td key={j} className="px-2 py-2 text-center text-muted-foreground/30 text-xs">–</td>
                                }
                                if (match.status === "walkover") {
                                  const won = match.winner_id === rowPlayer.profile_id
                                  return <td key={j} className={cn("px-2 py-2 text-center text-xs font-semibold", won ? "text-green-700 dark:text-green-400" : "text-muted-foreground")}>WO</td>
                                }
                                const sets = (match.match_sets ?? []) as any[]
                                const myW = sets.filter((s: any) => s.points_a > s.points_b).length
                                const thW = sets.filter((s: any) => s.points_b > s.points_a).length
                                return (
                                  <td key={j} className={cn("px-2 py-2 text-center font-mono text-xs font-semibold tabular-nums", myW > thW ? "text-green-700 dark:text-green-400" : "text-muted-foreground")}>
                                    {myW}:{thW}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Do rozegrania */}
                {pendingMatches.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Do rozegrania ({pendingMatches.length})
                    </h3>
                    <div className="rounded-lg border divide-y text-sm">
                      {rounds.map((round) => {
                        const rp = (round.matches ?? []).filter(
                          (m: any) => m.status === "scheduled" || m.status === "postponed"
                        )
                        if (rp.length === 0) return null
                        return (
                          <div key={round.id}>
                            <div className="px-3 py-1.5 bg-muted/40 text-xs text-muted-foreground font-medium">{round.name}</div>
                            {rp.map((m: any) => {
                              const nameA = playerRefs.find((p) => p.id === m.player_a_id)?.name ?? "?"
                              const nameB = playerRefs.find((p) => p.id === m.player_b_id)?.name ?? "?"
                              return (
                                <div key={m.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/20">
                                  <span>{nameA}</span>
                                  <span className="text-xs text-muted-foreground/50 mx-2">vs</span>
                                  <span>{nameB}</span>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {playerRefs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Brak zawodników w lidze.</p>
                )}

              </div>
            </details>
          )
        })}
      </div>

      <div className="text-center py-6 text-xs text-muted-foreground border-t">
        Platforma{" "}
        <Link href="/" className="underline underline-offset-2">SquashLeague</Link>
      </div>
    </div>
  )
}

function EmptyPage({ center, competition, season, centerSlug }: any) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="text-xs text-muted-foreground mb-1.5">
            <Link href={`/c/${centerSlug}`} className="hover:underline">{center.name}</Link>
            {" / "}{competition.name}{" / "}{season.name}
          </div>
          <h1 className="text-xl font-bold">{season.name}</h1>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-muted-foreground">
        Brak lig w tym sezonie.
      </div>
    </div>
  )
}
