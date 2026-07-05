import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getLadderDetail } from "@/lib/actions/ladders"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LadderManagePanel } from "./LadderManagePanel"
import { ProcessChallengeButton } from "./ProcessChallengeButton"

export default async function LadderDetailPage({
  params,
}: { params: Promise<{ id: string; ladderId: string }> }) {
  const { id: competitionId, ladderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/dashboard/center")

  const ladder = await getLadderDetail(ladderId) as any
  if (!ladder) notFound()

  const comp = ladder.competitions as any
  if (comp?.center_id !== center.id) notFound()

  // Get player names
  const positions = ((ladder.ladder_positions ?? []) as any[]).sort(
    (a, b) => a.position - b.position
  )
  const challenges = ((ladder.challenges ?? []) as any[]).filter(
    (c: any) => c.status === "pending" || c.status === "accepted"
  )

  // Get competition players not yet in ladder
  const ladderProfileIds = new Set(positions.map((p: any) => p.profile_id))
  const { data: compPlayers } = await supabase
    .from("competition_players")
    .select("profile_id, players!inner(first_name, last_name)")
    .eq("competition_id", competitionId)
    .eq("invitation_status", "accepted")
  const available = (compPlayers ?? []).filter(
    (cp: any) => !ladderProfileIds.has(cp.profile_id)
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1 flex-wrap">
          <Link href={`/dashboard/center/competitions/${competitionId}`} className="hover:underline">
            {comp?.name}
          </Link>
          <span>/</span>
          <Link href={`/dashboard/center/competitions/${competitionId}/ladders`} className="hover:underline">
            Drabinki
          </Link>
          <span>/</span>
          <span>{ladder.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{ladder.name}</h1>
          <Badge variant={ladder.status === "active" ? "default" : "secondary"}>
            {ladder.status === "active" ? "Aktywna" : "Zatrzymana"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Max odległość wyzwania: {ladder.max_challenge_distance} · Deadline: {ladder.challenge_deadline_days} dni · Ochrona: {ladder.protection_days} dni
        </p>
      </div>

      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="ranking">Ranking ({positions.length})</TabsTrigger>
          <TabsTrigger value="challenges">
            Wyzwania
            {challenges.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
                {challenges.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="manage">Zawodnicy</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="mt-4">
          <Card>
            {positions.length === 0 ? (
              <CardContent className="py-8 text-center text-muted-foreground">
                Brak zawodników.
              </CardContent>
            ) : (
              <div className="divide-y">
                {positions.map((p: any) => {
                  const isProtected = p.protected_until && new Date(p.protected_until) > new Date()
                  return (
                    <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                      <span className="text-xl font-bold w-8 text-center text-primary">
                        {p.position}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {p.players?.first_name} {p.players?.last_name}
                        </p>
                        {p.previous_position && p.previous_position !== p.position && (
                          <p className="text-xs text-muted-foreground">
                            Poprzednio: {p.previous_position}
                            {p.position < p.previous_position ? (
                              <span className="text-green-600 ml-1">▲</span>
                            ) : (
                              <span className="text-red-600 ml-1">▼</span>
                            )}
                          </p>
                        )}
                      </div>
                      {isProtected && (
                        <Badge variant="outline" className="text-xs">
                          🛡 chroniony
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="challenges" className="mt-4 space-y-3">
          {challenges.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Brak aktywnych wyzwań.
              </CardContent>
            </Card>
          ) : (
            challenges.map((c: any) => {
              const challengerName = c.challenger
                ? `${c.challenger.first_name} ${c.challenger.last_name}`
                : "?"
              const challengedName = c.challenged
                ? `${c.challenged.first_name} ${c.challenged.last_name}`
                : "?"
              return (
                <Card key={c.id}>
                  <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {challengerName} wyzwał {challengedName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Deadline: {new Date(c.deadline).toLocaleDateString("pl")} · Status:{" "}
                        {c.status === "pending" ? "oczekuje na akceptację" : "zaakceptowane — mecz zaplanowany"}
                      </p>
                    </div>
                    {c.status === "accepted" && c.match_id && (
                      <ProcessChallengeButton challengeId={c.id} />
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="manage" className="mt-4">
          <LadderManagePanel
            ladderId={ladderId}
            positions={positions}
            availablePlayers={available as any[]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
