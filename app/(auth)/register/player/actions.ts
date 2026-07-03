"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function registerPlayer(data: {
  email: string
  password: string
  first_name: string
  last_name: string
  phone: string
  skill_level: string
}): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })

  if (signUpError || !authData.user) {
    return { error: signUpError?.message ?? "Błąd rejestracji." }
  }

  const userId = authData.user.id

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: userId, role: "player" })

  if (profileError) {
    return { error: "Błąd tworzenia profilu." }
  }

  const { error: playerError } = await supabase
    .from("players")
    .insert({
      profile_id: userId,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || null,
      skill_level: data.skill_level,
    })

  if (playerError) {
    return { error: "Błąd tworzenia profilu zawodnika." }
  }

  redirect("/dashboard")
}
