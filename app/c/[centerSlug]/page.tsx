import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Phone, Trophy } from "lucide-react"

export const revalidate = 60

export default async function PublicCenterPage({
  params,
}: {
  params: Promise<{ centerSlug: string }>
}) {
  const { centerSlug } = await params
  const supabase = await createClient()

  const { data: center } = await supabase
    .from("centers")
    .select("id, name, slug, city, address, phone, description, logo_url")
    .eq("slug", centerSlug)
    .eq("is_active", true)
    .single()

  if (!center) notFound()

  // Fetch active competitions with their active seasons and leagues
  const { data: competitions } = await supabase
    .from("competitions")
    .select(`
      id, name, slug, visibility,
      seasons(
        id, name, status,
        leagues(id, name, level, league_players(count))
      )
    `)
    .eq("center_id", center.id)
    .in("visibility", ["public", "mixed"])
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  const comps = (competitions ?? []) as any[]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-4">
            {center.logo_url ? (
              <img
                src={center.logo_url}
                alt={center.name}
                className="h-16 w-16 rounded-xl object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{center.name}</h1>
              {center.city && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{center.city}</span>
                  {center.address && <span>· {center.address}</span>}
                </div>
              )}
              {center.phone && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{center.phone}</span>
                </div>
              )}
            </div>
          </div>
          {center.description && (
            <p className="mt-4 text-muted-foreground">{center.description}</p>
          )}
        </div>
      </div>

      {/* Competitions */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Rozgrywki</h2>

        {comps.length === 0 && (
          <p className="text-muted-foreground">Brak aktywnych rozgrywek.</p>
        )}

        {comps.map((comp) => {
          const seasons = (comp.seasons ?? []) as any[]
          const activeSeasons = seasons.filter(
            (s: any) => s.status === "active" || s.status === "finished"
          )
          return (
            <div key={comp.id}>
              <h3 className="font-semibold text-lg mb-3">{comp.name}</h3>
              {activeSeasons.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak aktywnych sezonów.</p>
              ) : (
                activeSeasons.map((season: any) => {
                  const leagues = (season.leagues ?? []).sort(
                    (a: any, b: any) => a.level - b.level
                  )
                  return (
                    <Card key={season.id} className="mb-3">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{season.name}</CardTitle>
                          <Badge
                            variant={season.status === "active" ? "default" : "secondary"}
                          >
                            {season.status === "active" ? "Aktywny" : "Zakończony"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {leagues.map((league: any) => {
                          const count =
                            league.league_players?.[0]?.count ?? 0
                          return (
                            <Link
                              key={league.id}
                              href={`/c/${centerSlug}/${comp.slug}/${season.id}`}
                              className="flex items-center justify-between py-2 px-3 rounded-md border hover:bg-muted/50 transition-colors"
                            >
                              <span className="text-sm font-medium">
                                {league.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {count} zawodników →
                              </span>
                            </Link>
                          )
                        })}
                      </CardContent>
                    </Card>
                  )
                })
              )}
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
