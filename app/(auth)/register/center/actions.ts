"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function registerCenter(data: {
  email: string
  password: string
  name: string
  address: string
  postal_code: string
  city: string
  phone: string
  nip: string
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
    .insert({ id: userId, role: "center" })

  if (profileError) {
    return { error: "Błąd tworzenia profilu." }
  }

  const { error: centerError } = await supabase
    .from("centers")
    .insert({
      profile_id: userId,
      name: data.name,
      address: data.address || null,
      postal_code: data.postal_code || null,
      city: data.city || null,
      phone: data.phone || null,
      nip: data.nip || null,
    })

  if (centerError) {
    return { error: "Błąd tworzenia centrum." }
  }

  redirect("/dashboard")
}
