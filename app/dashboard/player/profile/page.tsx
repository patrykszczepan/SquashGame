import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "./ProfileForm"

export default async function PlayerProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: player } = await supabase
    .from("players")
    .select("first_name, last_name, phone")
    .eq("profile_id", user.id)
    .single()

  if (!player) redirect("/dashboard/player")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mój profil</h1>
        <p className="text-muted-foreground">Zarządzaj swoimi danymi i ustawieniami konta.</p>
      </div>
      <ProfileForm player={player} email={user.email ?? ""} />
    </div>
  )
}
