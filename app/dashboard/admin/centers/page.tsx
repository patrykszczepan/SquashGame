import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Phone } from "lucide-react"
import { BlockCenterButton } from "./BlockCenterButton"

export default async function AdminCentersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "super_admin") redirect("/dashboard")

  const { data: centers } = await supabase
    .from("centers")
    .select("*, profiles(role, created_at)")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Centra squash</h1>
          <p className="text-muted-foreground">{centers?.length ?? 0} zarejestrowanych</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {centers?.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              Brak zarejestrowanych centrów
            </CardContent>
          </Card>
        )}
        {centers?.map((center) => {
          const isBlocked = !center.is_active
          return (
            <Card key={center.id} className={isBlocked ? "border-destructive/40 bg-destructive/5" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{center.name}</CardTitle>
                  <Badge variant={isBlocked ? "destructive" : "secondary"}>
                    {isBlocked ? "zablokowane" : "aktywne"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {center.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{center.city}</span>
                  </div>
                )}
                {center.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{center.phone}</span>
                  </div>
                )}
                {isBlocked && center.blocked_reason && (
                  <p className="text-xs text-destructive">Powód: {center.blocked_reason}</p>
                )}
                <p className="text-xs pt-1">
                  Zarejestrowane: {new Date(center.created_at).toLocaleDateString("pl-PL")}
                </p>
                <div className="pt-1">
                  <BlockCenterButton centerId={center.id} isBlocked={isBlocked} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
