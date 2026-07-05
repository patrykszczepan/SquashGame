import { redirect } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { createClient } from "@/lib/supabase/server"
import { getMyCompetitions } from "@/lib/actions/competitions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trophy, ChevronRight } from "lucide-react"

const statusColors: Record<string, string> = {
  draft: "secondary",
  active: "default",
  finished: "outline",
}

export default async function CompetitionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const t = await getTranslations("competitions")
  const competitions = await getMyCompetitions()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/center/competitions/new">
            <Plus className="h-4 w-4 mr-2" />
            {t("newCompetition")}
          </Link>
        </Button>
      </div>

      {competitions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">{t("empty.title")}</p>
            <p className="text-muted-foreground mb-6">{t("empty.description")}</p>
            <Button asChild>
              <Link href="/dashboard/center/competitions/new">
                <Plus className="h-4 w-4 mr-2" />
                {t("newCompetition")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {competitions.map((comp: any) => {
            const activeSeason = (comp.seasons ?? []).find((s: any) => s.status === "active")
            const draftSeasons = (comp.seasons ?? []).filter((s: any) => s.status === "draft").length
            const isArchived = comp.is_archived ?? false

            return (
              <Link key={comp.id} href={`/dashboard/center/competitions/${comp.id}`}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isArchived ? "opacity-60" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Trophy className={`h-5 w-5 ${isArchived ? "text-muted-foreground/50" : "text-muted-foreground"}`} />
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{comp.name}</CardTitle>
                          {isArchived && (
                            <Badge variant="outline" className="text-xs">Zarchiwizowane</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={comp.visibility === "public" ? "default" : "secondary"}>
                          {comp.visibility === "public" ? t("visibility.public") : t("visibility.private")}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {isArchived ? (
                        <span>Zarchiwizowane</span>
                      ) : activeSeason ? (
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                          {t("activeSeason")}: {activeSeason.name}
                        </span>
                      ) : draftSeasons > 0 ? (
                        <span>{t("draftSeasons", { count: draftSeasons })}</span>
                      ) : (
                        <span>{t("noSeasons")}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
