import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getTournamentDetail } from "@/lib/actions/tournaments"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TournamentPlayersPanel } from "./TournamentPlayersPanel"
import { BracketView } from "./BracketView"

export default async function TournamentDetailPage({
  params,
}: { params: Promise<{ id: string; tournamentId: string }> }) {
  const { id: competitionId, tournamentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/dashboard/center")

  const tournament = await getTournamentDetail(tournamentId) as any
  if (!tournament) notFound()

  const comp = tournament.competitions as any
  if (comp?.center_id !== center.id) notFound()

  // Player names map
  const playerIds: string[] = (tournament.config as any)?.players ?? []
  const { data: playerRows } = await supabase
    .from("players")
    .select("profile_id, first_name, last_name")
    .in("profile_id", playerIds.length ? playerIds : ["00000000-0000-0000-0000-000000000000"])

  const nameMap: Record<string, string> = {}
  for (const p of playerRows ?? []) {
    nameMap[p.profile_id] = `${p.first_name} ${p.last_name}`
  }

  // Also get names for all slot players
  const slotProfileIds = (tournament.tournament_slots ?? [])
    .filter((s: any) => s.profile_id)
    .map((s: any) => s.profile_id)
  const allIds = [...new Set([...playerIds, ...slotProfileIds])]
  if (allIds.length > 0) {
    const { data: more } = await supabase
      .from("players")
      .select("profile_id, first_name, last_name")
      .in("profile_id", allIds)
    for (const p of more ?? []) {
      nameMap[p.profile_id] = `${p.first_name} ${p.last_name}`
    }
  }

  // Get competition players for adding to tournament
  const { data: compPlayers } = await supabase
    .from("competition_players")
    .select("profile_id, players!inner(first_name, last_name)")
    .eq("competition_id", competitionId)
    .eq("invitation_status", "accepted")

  const statusLabel: Record<string, string> = {
    draft: "Szkic",
    active: "W toku",
    finished: "Zakończony",
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1 flex-wrap">
          <Link href={`/dashboard/center/competitions/${competitionId}`} className="hover:underline">
            {comp?.name}
          </Link>
          <span>/</span>
          <Link href={`/dashboard/center/competitions/${competitionId}/tournaments`} className="hover:underline">
            Turnieje
          </Link>
          <span>/</span>
          <span>{tournament.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <Badge variant={tournament.status === "active" ? "default" : "secondary"}>
            {statusLabel[tournament.status] ?? tournament.status}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue={tournament.status === "draft" ? "players" : "bracket"}>
        <TabsList>
          <TabsTrigger value="bracket">Drabinka</TabsTrigger>
          <TabsTrigger value="players">Zawodnicy</TabsTrigger>
        </TabsList>

        <TabsContent value="bracket" className="mt-4">
          {tournament.status === "draft" ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Dodaj zawodników i wygeneruj drabinkę.
              </CardContent>
            </Card>
          ) : (
            <BracketView
              tournamentId={tournamentId}
              slots={tournament.tournament_slots ?? []}
              nameMap={nameMap}
              status={tournament.status}
            />
          )}
        </TabsContent>

        <TabsContent value="players" className="mt-4">
          <TournamentPlayersPanel
            tournamentId={tournamentId}
            currentPlayerIds={playerIds}
            nameMap={nameMap}
            availablePlayers={(compPlayers ?? []) as any[]}
            status={tournament.status}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
