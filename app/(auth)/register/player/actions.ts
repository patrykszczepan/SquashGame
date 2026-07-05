"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function registerPlayer(data: {
  email: string
  password: string
  first_name: string
  last_name: string
  phone: string
  joinCode?: string
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
  // Use admin client to bypass RLS — after signUp with email confirmation,
  // there is no active session, so anon client cannot insert into profiles.
  const admin = createAdminClient()

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: userId, role: "player" })

  if (profileError) {
    return { error: `Błąd tworzenia profilu: ${profileError.message}` }
  }

  const { error: playerError } = await admin
    .from("players")
    .insert({
      profile_id: userId,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || null,
    })

  if (playerError) {
    return { error: `Błąd tworzenia profilu zawodnika: ${playerError.message}` }
  }

  if (data.joinCode) {
    redirect(`/join/${data.joinCode}`)
  }
  redirect("/register/player/confirm")
}
