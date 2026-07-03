"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function completePlayerProfile(data: {
  first_name: string
  last_name: string
  phone: string
  skill_level: string
}): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Brak sesji. Zaloguj się ponownie." }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: user.id, role: "player" })

  if (profileError) return { error: "Błąd tworzenia profilu." }

  const { error: playerError } = await supabase
    .from("players")
    .insert({
      profile_id: user.id,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || null,
      skill_level: data.skill_level,
    })

  if (playerError) return { error: "Błąd tworzenia profilu zawodnika." }

  redirect("/dashboard")
}
