import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getCompetitionLadders } from "@/lib/actions/ladders"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Plus, Users } from "lucide-react"

export default async function LaddersPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/dashboard/center")

  const { data: competition } = await supabase
    .from("competitions")
    .select("id, name")
    .eq("id", competitionId)
    .eq("center_id", center.id)
    .single()
  if (!competition) notFound()

  const ladders = await getCompetitionLadders(competitionId)

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-muted-foreground mb-1">
          <Link href={`/dashboard/center/competitions/${competitionId}`} className="hover:underline">
            ← {competition.name}
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Drabinki challenge</h1>
          <Button asChild size="sm">
            <Link href={`/dashboard/center/competitions/${competitionId}/ladders/new`}>
              <Plus className="h-4 w-4 mr-1" /> Nowa drabinka
            </Link>
          </Button>
        </div>
      </div>

      {(ladders as any[]).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Brak drabinek challenge.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(ladders as any[]).map((l) => (
            <Link key={l.id} href={`/dashboard/center/competitions/${competitionId}/ladders/${l.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{l.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Max odległość: {l.max_challenge_distance} · Deadline: {l.challenge_deadline_days} dni
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {l.ladder_positions?.[0]?.count ?? 0}
                      </span>
                      <Badge variant={l.status === "active" ? "default" : "secondary"}>
                        {l.status === "active" ? "Aktywna" : "Zatrzymana"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
