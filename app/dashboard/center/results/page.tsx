import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { CenterResultCard } from "./CenterResultCard"

export default async function CenterResultsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/dashboard/center")

  // Fetch all scheduled/pending matches for this center's competitions
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      id, status, player_a_id, player_b_id, winner_id, submitted_by,
      match_sets(set_number, points_a, points_b),
      rounds(name, number),
      leagues!inner(
        id, name, level, match_format,
        seasons!inner(
          id, name,
          competitions!inner(id, name, center_id)
        )
      )
    `)
    .in("status", ["scheduled", "postponed", "pending_confirmation"])
    .eq("leagues.seasons.competitions.center_id", center.id)
    .order("created_at", { ascending: false })
    .limit(100)

  const allMatches = (matches ?? []) as any[]

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wpisywanie wyników</h1>
        <p className="text-muted-foreground">
          Wpisz wynik z kartki — zostanie natychmiast zatwierdzony.
        </p>
      </div>

      {allMatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Brak meczów do wpisania wyników.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allMatches.map((m) => (
            <CenterResultCard key={m.id} match={m} nameMap={nameMap} />
          ))}
        </div>
      )}
    </div>
  )
}
