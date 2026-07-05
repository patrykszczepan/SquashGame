import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SubmitResultCard } from "./SubmitResultCard"
import { ConfirmResultCard } from "./ConfirmResultCard"

export default async function PlayerMatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: matches } = await supabase
    .from("matches")
    .select(`
      id, status, winner_id, player_a_id, player_b_id,
      submitted_by, auto_confirm_at,
      match_sets(set_number, points_a, points_b),
      rounds(name, number),
      leagues(name, level, match_format, result_confirm_days)
    `)
    .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(60)

  const allMatches = (matches ?? []) as any[]

  // Fetch player names for all unique profile IDs
  const allProfileIds = new Set<string>()
  for (const m of allMatches) {
    if (m.player_a_id) allProfileIds.add(m.player_a_id)
    if (m.player_b_id) allProfileIds.add(m.player_b_id)
  }
  const { data: playerNames } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .in("id", [...allProfileIds])
  const nameMap: Record<string, string> = {}
  for (const p of playerNames ?? []) {
    nameMap[p.id] = `${p.first_name} ${p.last_name}`
  }

  const pending = allMatches.filter(
    (m) => m.status === "pending_confirmation" && m.submitted_by !== user.id
  )
  const toSubmit = allMatches.filter(
    (m) => m.status === "scheduled" || m.status === "postponed"
  )
  const finished = allMatches.filter(
    (m) => m.status === "finished" || m.status === "walkover" || m.status === "not_played"
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moje mecze</h1>
        <p className="text-muted-foreground">Wpisuj wyniki i potwierdzaj mecze rywali.</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Do potwierdzenia
            {pending.length > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-xs">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="submit">Do zagrania ({toSubmit.length})</TabsTrigger>
          <TabsTrigger value="finished">Zakończone</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pending.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Brak wyników do potwierdzenia.
              </CardContent>
            </Card>
          ) : (
            pending.map((m) => (
              <ConfirmResultCard
                key={m.id}
                match={m}
                currentUserId={user.id}
                nameMap={nameMap}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="submit" className="space-y-3 mt-4">
          {toSubmit.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Brak zaplanowanych meczów.
              </CardContent>
            </Card>
          ) : (
            toSubmit.map((m) => (
              <SubmitResultCard
                key={m.id}
                match={m}
                currentUserId={user.id}
                nameMap={nameMap}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="finished" className="space-y-3 mt-4">
          {finished.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Brak zakończonych meczów.
              </CardContent>
            </Card>
          ) : (
            finished.map((m) => {
              const setsA = (m.match_sets ?? []).filter(
                (s: any) => s.points_a > s.points_b
              ).length
              const setsB = (m.match_sets ?? []).filter(
                (s: any) => s.points_b > s.points_a
              ).length
              const won = m.winner_id === user.id
              return (
                <Card key={m.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          vs {nameMap[m.player_a_id === user.id ? m.player_b_id : m.player_a_id] ?? "?"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.leagues?.name} · {m.rounds?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {m.status === "walkover" ? "walkower" : `${setsA}:${setsB}`}
                        </span>
                        <Badge variant={won ? "default" : "secondary"}>
                          {won ? "Wygrana" : "Przegrana"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
