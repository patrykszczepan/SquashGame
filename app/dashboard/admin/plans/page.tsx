import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getPlans } from "@/lib/actions/admin"
import { PlansManager } from "./PlansManager"

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "super_admin") redirect("/dashboard")

  const plans = await getPlans()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plany subskrypcji</h1>
        <p className="text-muted-foreground">Zarządzaj dostępnymi planami dla centrów squasha.</p>
      </div>
      <PlansManager plans={(plans as any[]) ?? []} />
    </div>
  )
}
