import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPlayerStats } from "@/lib/stats/player"
import { Trophy, TrendingUp } from "lucide-react"

export const revalidate = 120

export default async function PublicPlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>
}) {
  const { playerId } = await params
  const supabase = await createClient()

  const { data: player } = await supabase
    .from("players")
    .select("id, first_name, last_name, profile_id, avatar_url")
    .eq("profile_id", playerId)
    .single()

  if (!player) notFound()

  const stats = await getPlayerStats(playerId, supabase as any)

  // Fetch active leagues
  const { data: leaguePlayers } = await supabase
    .from("league_players")
    .select(`
      position, promotion_status,
      leagues(
        name, level,
        seasons(name, status, competitions(name, slug, centers(name, slug)))
      )
    `)
    .eq("profile_id", playerId)
    .limit(10)

  const lps = (leaguePlayers ?? []) as any[]

  const winRate = stats.played > 0
    ? Math.round((stats.won / stats.played) * 100)
    : 0

  const setRatioNum = stats.sets_lost > 0
    ? (stats.sets_won / stats.sets_lost).toFixed(2)
    : stats.sets_won > 0 ? "∞" : "–"

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            {player.avatar_url ? (
              <img
                src={player.avatar_url}
                alt={`${player.first_name} ${player.last_name}`}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {player.first_name[0]}{player.last_name[0]}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {player.first_name} {player.last_name}
              </h1>
              <p className="text-sm text-muted-foreground">Profil zawodnika</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Statystyki</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Mecze", value: stats.played },
              { label: "% wygranych", value: `${winRate}%` },
              { label: "Sety", value: `${stats.sets_won}:${stats.sets_lost}` },
              { label: "Ratio setów", value: setRatioNum },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Form */}
        {stats.form.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Ostatnie mecze
            </h2>
            <div className="flex gap-2">
              {stats.form.map((r, i) => (
                <span
                  key={i}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    r === "W"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  }`}
                >
                  {r === "W" ? "W" : "P"}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Active leagues */}
        {lps.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5" /> Ligi
            </h2>
            <div className="space-y-2">
              {lps.map((lp, i) => {
                const league = lp.leagues
                const season = league?.seasons
                const comp = season?.competitions
                const centerSlug = comp?.centers?.slug
                const compSlug = comp?.slug
                const isActive = season?.status === "active"

                return (
                  <Card key={i}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{league?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {comp?.name} · {season?.name}
                        </p>
                        {comp?.centers?.name && (
                          <p className="text-xs text-muted-foreground">
                            {comp.centers.name}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {isActive ? "Aktywny" : "Zakończony"}
                        </Badge>
                        {lp.position && (
                          <span className="text-xs text-muted-foreground">
                            Pozycja: {lp.position}
                          </span>
                        )}
                        {centerSlug && compSlug && season?.id && (
                          <Link
                            href={`/c/${centerSlug}/${compSlug}/${season.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            Tabela →
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
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
