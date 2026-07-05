import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calculateTable } from "@/lib/scoring/engine"
import type { ScoringConfig, Match } from "@/lib/types"
import { cn } from "@/lib/utils"
import { PlayerRowActions } from "./PlayerRowActions"
import { GenerateScheduleButton, ResetScheduleButton } from "./GenerateScheduleButton"
import { LeagueActions } from "./LeagueActions"
import { AssignLeaguePlayersDialog } from "./AssignLeaguePlayersDialog"
import { AddGuestToLeagueDialog } from "./AddGuestToLeagueDialog"
import { EnterMatchResultDialog } from "./EnterMatchResultDialog"

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
    .select("id, num_courts")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/dashboard/center")

  // Fetch league — RLS handles access control
  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", leagueId)
    .single()
  if (!league) notFound()

  // Fetch season
  const { data: season } = await supabase
    .from("seasons")
    .select("id, name, competition_id")
    .eq("id", league.season_id)
    .single()
  if (!season) notFound()

  // Fetch competition — verify center ownership
  const { data: competition } = await supabase
    .from("competitions")
    .select("id, name, center_id")
    .eq("id", season.competition_id)
    .single()
  if (!competition || competition.center_id !== center.id) notFound()

  // Fetch scoring config
  const { data: scoringConfigRow } = await supabase
    .from("scoring_configs")
    .select("config")
    .eq("league_id", leagueId)
    .maybeSingle()

  // Fetch league players basic data — avoid PostgREST join syntax which can fail on new FKs
  const { data: leaguePlayersBase } = await supabase
    .from("league_players")
    .select("id, profile_id, center_player_id, position")
    .eq("league_id", leagueId)

  const lpBase = leaguePlayersBase ?? []
  const profileIds = lpBase.map((lp) => lp.profile_id).filter(Boolean) as string[]
  const centerPlayerIds = lpBase.map((lp) => lp.center_player_id).filter(Boolean) as string[]

  // Fetch player names separately — more reliable than PostgREST join on new FK columns
  const [playersRes, centerPlayersRes, roundsRes, compPlayersRes, availableCenterRes] =
    await Promise.all([
      profileIds.length > 0
        ? supabase.from("players").select("profile_id, first_name, last_name").in("profile_id", profileIds)
        : Promise.resolve({ data: [] as { profile_id: string; first_name: string; last_name: string }[] }),
      centerPlayerIds.length > 0
        ? supabase.from("center_players").select("id, first_name, last_name, email, phone").in("id", centerPlayerIds)
        : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string; email: string | null; phone: string | null }[] }),
      supabase
        .from("rounds")
        .select(`id, name, number, deadline, matches(id, player_a_id, player_b_id, status, winner_id, walkover_for_id, result_source, submitted_by, match_sets(set_number, points_a, points_b))`)
        .eq("league_id", leagueId)
        .order("number"),
      supabase
        .from("competition_players")
        .select("profile_id")
        .eq("competition_id", season.competition_id)
        .eq("invitation_status", "accepted"),
      supabase
        .from("center_players")
        .select("id, first_name, last_name, email, phone")
        .eq("center_id", center.id)
        .eq("is_archived", false)
        .order("last_name"),
    ])

  const playerNameMap = new Map((playersRes.data ?? []).map((p) => [p.profile_id, p]))
  const centerPlayerMap = new Map((centerPlayersRes.data ?? []).map((p) => [p.id, p]))

  const leaguePlayers = lpBase.map((lp) => ({
    ...lp,
    players: lp.profile_id ? (playerNameMap.get(lp.profile_id) ?? null) : null,
    center_players: lp.center_player_id ? (centerPlayerMap.get(lp.center_player_id) ?? null) : null,
  }))

  const rounds = (roundsRes.data ?? []) as any[]

  // Fetch player names for competition players separately
  const compPlayerIds = (compPlayersRes.data ?? []).map((cp) => cp.profile_id).filter(Boolean) as string[]
  const { data: compPlayerNames } = compPlayerIds.length > 0
    ? await supabase.from("players").select("profile_id, first_name, last_name").in("profile_id", compPlayerIds)
    : { data: [] as { profile_id: string; first_name: string; last_name: string }[] }
  const compPlayerNamesMap = new Map((compPlayerNames ?? []).map((p) => [p.profile_id, p]))
  const compPlayers = (compPlayersRes.data ?? []).map((cp) => ({
    profile_id: cp.profile_id,
    players: compPlayerNamesMap.get(cp.profile_id) ?? null,
  }))
  const centerPlayersRaw = availableCenterRes.data ?? []

  const leagueProfileIds = new Set(lpBase.map((lp) => lp.profile_id).filter(Boolean))
  const leagueCenterPlayerIds = new Set(lpBase.map((lp) => lp.center_player_id).filter(Boolean))

  // Fetch all other leagues in this season to detect cross-league conflicts
  const { data: otherLeagues } = await supabase
    .from("leagues")
    .select("id, name, league_players(profile_id, center_player_id)")
    .eq("season_id", season.id)
    .neq("id", leagueId)

  const profileInLeague: Record<string, string> = {}
  const centerPlayerInLeague: Record<string, string> = {}
  for (const l of otherLeagues ?? []) {
    for (const lp of (l.league_players ?? []) as { profile_id: string | null; center_player_id: string | null }[]) {
      if (lp.profile_id) profileInLeague[lp.profile_id] = l.name
      if (lp.center_player_id) centerPlayerInLeague[lp.center_player_id] = l.name
    }
  }

  // Available = in competition but NOT yet in this league (already-in-other-league shown greyed in dialog)
  const availablePlayers = (compPlayers ?? []).filter(
    (cp: any) => !leagueProfileIds.has(cp.profile_id)
  )

  const availableCenterPlayers = (centerPlayersRaw ?? []).filter(
    (cp: any) => !leagueCenterPlayerIds.has(cp.id)
  )

  // Flatten matches from all rounds
  const allMatches: Match[] = rounds.flatMap((r: any) => r.matches ?? [])
  const hasSchedule = allMatches.length > 0

  // Calculate table
  const scoringConfig: ScoringConfig =
    (scoringConfigRow?.config as ScoringConfig) ?? {
      win_by_sets: { "3:0": 5, "3:1": 4, "3:2": 3 },
      loss_by_sets: { "0:3": 0, "1:3": 1, "2:3": 2 },
      set_point: { enabled: false, value: 0 },
      participation_point: { enabled: false, value: 0 },
      walkover: { winner: 5, loser: 0 },
      not_played: { a: 0, b: 0 },
      tiebreaker: ["points", "head_to_head", "set_ratio", "small_points", "matches_played"],
    }

  const playerRefs = leaguePlayers.map((lp: any) => {
    const isGuest = !lp.profile_id && lp.center_player_id
    return {
      id: lp.profile_id ?? lp.center_player_id,
      name: isGuest
        ? `${lp.center_players?.first_name ?? ""} ${lp.center_players?.last_name ?? ""}`.trim()
        : `${lp.players?.first_name ?? ""} ${lp.players?.last_name ?? ""}`.trim(),
    }
  })

  const table = calculateTable(playerRefs, allMatches, scoringConfig)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1 flex-wrap">
          <Link href="/dashboard/center/competitions" className="hover:underline">Rozgrywki</Link>
          <span>/</span>
          <Link href={`/dashboard/center/competitions/${competitionId}`} className="hover:underline">
            {competition.name}
          </Link>
          <span>/</span>
          <Link href={`/dashboard/center/competitions/${competitionId}/seasons/${seasonId}`} className="hover:underline">
            {season.name}
          </Link>
          <span>/</span>
          <span>{league.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{league.name}</h1>
            <Badge variant="outline">Liga {league.level}</Badge>
            {league.is_archived && (
              <Badge variant="secondary">Zarchiwizowana</Badge>
            )}
          </div>
          <LeagueActions
            leagueId={leagueId}
            leagueName={league.name}
            isArchived={league.is_archived ?? false}
            competitionId={competitionId}
            seasonId={seasonId}
          />
        </div>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Tabela</TabsTrigger>
          <TabsTrigger value="results">Wyniki</TabsTrigger>
          <TabsTrigger value="schedule">Terminarz</TabsTrigger>
          <TabsTrigger value="players">Zawodnicy</TabsTrigger>
        </TabsList>

        {/* TABLE */}
        <TabsContent value="table" className="space-y-4">
          {table.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Brak zawodników w lidze.
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0">
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
                    {table.map((row, idx) => {
                      const promotions = league.promotions ?? 0
                      const demotions = league.demotions ?? 0
                      const isPromotion = promotions > 0 && idx < promotions
                      const isDemotion = demotions > 0 && idx >= table.length - demotions
                      return (
                        <tr
                          key={row.profile_id}
                          className={cn(
                            "border-b last:border-0",
                            isPromotion && "bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50",
                            isDemotion && "bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50",
                            !isPromotion && !isDemotion && "hover:bg-muted/30"
                          )}
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
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* RESULTS MATRIX */}
        <TabsContent value="results" className="space-y-4">
          {table.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Brak zawodników w lidze.
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0">
              <div className="overflow-x-auto">
                <table className="text-sm border-collapse w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[10rem]">
                        Zawodnik
                      </th>
                      {table.map((_, j) => (
                        <th key={j} className="px-3 py-2.5 text-center font-semibold w-14">
                          {j + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((rowPlayer, i) => (
                      <tr key={rowPlayer.profile_id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium whitespace-nowrap">
                          <span className="text-muted-foreground mr-2 tabular-nums">{i + 1}.</span>
                          {rowPlayer.player_name}
                        </td>
                        {table.map((colPlayer, j) => {
                          if (i === j) {
                            return <td key={j} className="bg-muted/40 border-l border-r border-muted" />
                          }
                          // Only the match where rowPlayer is player_a (gospodarz)
                          const match = (allMatches as any[]).find((m: any) =>
                            m.player_a_id === rowPlayer.profile_id &&
                            m.player_b_id === colPlayer.profile_id
                          )
                          if (!match || (match.status !== "finished" && match.status !== "walkover")) {
                            return (
                              <td key={j} className="px-3 py-2 text-center text-muted-foreground/40">–</td>
                            )
                          }
                          if (match.status === "walkover") {
                            const won = match.winner_id === rowPlayer.profile_id
                            return (
                              <td key={j} className={cn(
                                "px-3 py-2 text-center text-xs font-semibold",
                                won ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
                              )}>
                                WO
                              </td>
                            )
                          }
                          const sets = (match.match_sets ?? []) as any[]
                          const myWins = sets.filter((s: any) => s.points_a > s.points_b).length
                          const theirWins = sets.filter((s: any) => s.points_b > s.points_a).length
                          const won = myWins > theirWins
                          return (
                            <td key={j} className={cn(
                              "px-3 py-2 text-center font-mono text-xs font-semibold tabular-nums",
                              won ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
                            )}>
                              {myWins}:{theirWins}
                            </td>
                          )
                        })}
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
          {hasSchedule && (
            <div className="flex justify-end">
              <ResetScheduleButton leagueId={leagueId} />
            </div>
          )}
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
          {rounds.map((round: any) => {
            const roundMatches = (round.matches ?? []) as any[]
            const played = roundMatches.filter((m: any) => m.status === "finished" || m.status === "walkover").length
            return (
              <Card key={round.id} className="py-0 gap-0">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{round.name}</span>
                    {round.deadline && (
                      <span className="text-xs text-muted-foreground">
                        termin: {new Date(round.deadline).toLocaleDateString("pl")}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {played}/{roundMatches.length} rozegranych
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {roundMatches.map((m: any) => {
                        const lpA = leaguePlayers.find((lp: any) =>
                          (lp.profile_id ?? lp.center_player_id) === m.player_a_id
                        )
                        const lpB = leaguePlayers.find((lp: any) =>
                          (lp.profile_id ?? lp.center_player_id) === m.player_b_id
                        )
                        const getName = (lp: any) => {
                          if (!lp) return "?"
                          if (lp.players) return `${lp.players.last_name} ${lp.players.first_name}`
                          return `${lp.center_players?.last_name ?? ""} ${lp.center_players?.first_name ?? ""}`.trim() || "?"
                        }
                        const nameA = getName(lpA)
                        const nameB = getName(lpB)
                        const scoreA = (m.match_sets ?? []).filter((s: any) => s.points_a > s.points_b).length
                        const scoreB = (m.match_sets ?? []).filter((s: any) => s.points_b > s.points_a).length
                        const finished = m.status === "finished" || m.status === "walkover"
                        const pending = m.status === "pending_confirmation"
                        const winA = finished && m.winner_id === m.player_a_id
                        const winB = finished && m.winner_id === m.player_b_id

                        return (
                          <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className={`px-4 py-3 text-right w-[40%] ${winA ? "font-semibold" : "text-muted-foreground"}`}>
                              {nameA}
                            </td>
                            <td className="px-3 py-3 text-center w-[14%]">
                              {finished
                                ? <span className="font-mono font-semibold tabular-nums">{scoreA}&nbsp;:&nbsp;{scoreB}</span>
                                : pending
                                ? <span className="text-xs text-amber-500 font-medium">oczekuje</span>
                                : <span className="text-muted-foreground">–</span>}
                            </td>
                            <td className={`px-4 py-3 text-left w-[40%] ${winB ? "font-semibold" : "text-muted-foreground"}`}>
                              {nameB}
                            </td>
                            <td className="px-2 py-3 w-10">
                              <EnterMatchResultDialog
                                matchId={m.id}
                                playerAName={nameA}
                                playerBName={nameB}
                                playerAId={m.player_a_id}
                                playerBId={m.player_b_id}
                                setsToWin={(league.match_format as any)?.sets_to_win ?? 3}
                                existingSets={m.match_sets}
                                currentStatus={m.status}
                                scoringConfig={scoringConfig}
                                numCourts={(center as any).num_courts ?? 1}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          })}
        </TabsContent>

        {/* PLAYERS */}
        <TabsContent value="players" className="space-y-4">
          {/* Build lookup maps */}
          {(() => {
            const lpById = new Map(leaguePlayers.map((lp: any) => [lp.profile_id ?? lp.center_player_id, lp]))

            // Module 1: Zawodnicy zarejestrowani (z kontem)
            const allRegistered = [
              ...leaguePlayers.filter((lp: any) => lp.profile_id).map((lp: any) => ({
                profile_id: lp.profile_id,
                players: lp.players,
                inThisLeague: true,
              })),
              ...availablePlayers.map((cp: any) => ({
                profile_id: cp.profile_id,
                players: cp.players,
                inThisLeague: false,
              })),
            ]

            // Module 2: Zawodnicy centrum (bez konta)
            const allCenterPlayers = [
              ...leaguePlayers.filter((lp: any) => lp.center_player_id).map((lp: any) => ({
                id: lp.center_player_id,
                first_name: lp.center_players?.first_name ?? "—",
                last_name: lp.center_players?.last_name ?? "",
                inThisLeague: true,
              })),
              ...availableCenterPlayers.map((cp: any) => ({
                id: cp.id,
                first_name: cp.first_name,
                last_name: cp.last_name,
                inThisLeague: false,
              })),
            ]

            return (
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Moduł 1: Zawodnicy z kontem */}
                <Card className="py-0 gap-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                    <span className="font-semibold text-sm">
                      Zawodnicy zarejestrowani ({allRegistered.length})
                    </span>
                    <AssignLeaguePlayersDialog
                      leagueId={leagueId}
                      availableRegistered={availablePlayers as any[]}
                      availableCenterPlayers={[]}
                      profileInLeague={profileInLeague}
                      centerPlayerInLeague={{}}
                    />
                  </div>
                  {allRegistered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Brak zawodników z kontem.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-2 text-left font-medium">Zawodnik</th>
                          <th className="px-4 py-2 text-left font-medium">Status</th>
                          <th className="px-4 py-2 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {allRegistered.map((p: any) => {
                          const name = p.players
                            ? `${p.players.last_name} ${p.players.first_name}`
                            : "—"
                          const otherLeague = !p.inThisLeague ? profileInLeague[p.profile_id] : null
                          return (
                            <tr key={p.profile_id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="px-4 py-2.5 font-medium">{name}</td>
                              <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                {p.inThisLeague
                                  ? <span className="text-primary font-medium">w tej lidze</span>
                                  : otherLeague
                                  ? `${otherLeague}`
                                  : "wolny"}
                              </td>
                              <td className="px-4 py-2.5">
                                <PlayerRowActions
                                  leagueId={leagueId}
                                  inThisLeague={p.inThisLeague}
                                  profileId={p.profile_id}
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </Card>

                {/* Moduł 2: Zawodnicy centrum (bez konta) */}
                <Card className="py-0 gap-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                    <span className="font-semibold text-sm">
                      Zawodnicy centrum ({allCenterPlayers.length})
                    </span>
                    <div className="flex gap-2">
                      <AddGuestToLeagueDialog leagueId={leagueId} />
                      <AssignLeaguePlayersDialog
                        leagueId={leagueId}
                        availableRegistered={[]}
                        availableCenterPlayers={availableCenterPlayers as any[]}
                        profileInLeague={{}}
                        centerPlayerInLeague={centerPlayerInLeague}
                      />
                    </div>
                  </div>
                  {allCenterPlayers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Brak zawodników centrum.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-2 text-left font-medium">Zawodnik</th>
                          <th className="px-4 py-2 text-left font-medium">Status</th>
                          <th className="px-4 py-2 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {allCenterPlayers.map((p: any) => {
                          const name = `${p.last_name} ${p.first_name}`.trim() || "—"
                          const otherLeague = !p.inThisLeague ? centerPlayerInLeague[p.id] : null
                          return (
                            <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="px-4 py-2.5 font-medium">{name}</td>
                              <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                {p.inThisLeague
                                  ? <span className="text-primary font-medium">w tej lidze</span>
                                  : otherLeague
                                  ? `${otherLeague}`
                                  : "wolny"}
                              </td>
                              <td className="px-4 py-2.5">
                                <PlayerRowActions
                                  leagueId={leagueId}
                                  inThisLeague={p.inThisLeague}
                                  centerPlayerId={p.id}
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </Card>
              </div>
            )
          })()}
        </TabsContent>
      </Tabs>
    </div>
  )
}
