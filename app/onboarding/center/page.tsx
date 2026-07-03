import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CenterOnboardingForm } from "./form"

export default async function CenterOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile) redirect("/dashboard")

  const displayName: string = user.user_metadata?.full_name ?? user.email ?? ""

  return (
    <CenterOnboardingForm
      email={user.email ?? ""}
      initialName={displayName}
    />
  )
}
