"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function completeCenterProfile(data: {
  name: string
  address: string
  postal_code: string
  city: string
  phone: string
  nip: string
}): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Brak sesji. Zaloguj się ponownie." }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: user.id, role: "center" })

  if (profileError) return { error: "Błąd tworzenia profilu." }

  const { error: centerError } = await supabase
    .from("centers")
    .insert({
      profile_id: user.id,
      name: data.name,
      address: data.address || null,
      postal_code: data.postal_code || null,
      city: data.city || null,
      phone: data.phone || null,
      nip: data.nip || null,
    })

  if (centerError) return { error: "Błąd tworzenia centrum." }

  redirect("/dashboard")
}
