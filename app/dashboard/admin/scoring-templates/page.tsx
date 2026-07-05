import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getScoringTemplates } from "@/lib/actions/admin"
import { ScoringTemplatesManager } from "./ScoringTemplatesManager"

export default async function ScoringTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "super_admin") redirect("/dashboard")

  const templates = await getScoringTemplates()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Szablony punktacji</h1>
        <p className="text-muted-foreground">Globalne szablony dostępne dla wszystkich centrów.</p>
      </div>
      <ScoringTemplatesManager templates={(templates as any[]) ?? []} />
    </div>
  )
}
