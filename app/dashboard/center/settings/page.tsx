import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { SettingsForm } from "./SettingsForm"

export default async function CenterSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: center } = await supabase
    .from("centers")
    .select("name, slug, description, city, address, postal_code, phone, email, nip, num_courts")
    .eq("profile_id", user.id)
    .single()

  if (!center) redirect("/dashboard/center")

  const headersList = await headers()
  const host = headersList.get("host") ?? "localhost:3000"
  const proto = host.startsWith("localhost") ? "http" : "https"
  const publicBaseUrl = `${proto}://${host}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ustawienia centrum</h1>
        <p className="text-muted-foreground">Dane i konfiguracja twojego centrum squasha.</p>
      </div>
      <SettingsForm center={center} publicBaseUrl={publicBaseUrl} />
    </div>
  )
}
