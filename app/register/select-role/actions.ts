"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function selectRole(role: "player" | "center"): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Brak sesji. Zaloguj się ponownie." }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: user.id, role })

  if (profileError) {
    return { error: "Błąd tworzenia profilu." }
  }

  if (role === "player") {
    const name = user.user_metadata?.full_name ?? ""
    const parts = name.split(" ")
    const first_name = parts[0] ?? ""
    const last_name = parts.slice(1).join(" ") ?? ""

    await supabase.from("players").insert({
      profile_id: user.id,
      first_name,
      last_name,
      skill_level: "beginner",
    })
  } else {
    const name = user.user_metadata?.full_name ?? user.email ?? "Centrum"
    await supabase.from("centers").insert({
      profile_id: user.id,
      name,
    })
  }

  redirect("/dashboard")
}
