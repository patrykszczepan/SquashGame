import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Phone } from "lucide-react"

export default async function AdminCentersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

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
        {centers?.map((center) => (
          <Card key={center.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{center.name}</CardTitle>
                <Badge variant="secondary">aktywne</Badge>
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
              <p className="text-xs pt-1">
                Zarejestrowane: {new Date(center.created_at).toLocaleDateString("pl-PL")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
