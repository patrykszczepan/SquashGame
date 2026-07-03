import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PlayerOnboardingForm } from "./form"

export default async function PlayerOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile) redirect("/dashboard")

  const fullName: string = user.user_metadata?.full_name ?? ""
  const parts = fullName.split(" ")
  const firstName = parts[0] ?? ""
  const lastName = parts.slice(1).join(" ") ?? ""

  return (
    <PlayerOnboardingForm
      email={user.email ?? ""}
      initialFirstName={firstName}
      initialLastName={lastName}
    />
  )
}
