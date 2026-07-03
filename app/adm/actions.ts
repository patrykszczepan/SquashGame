"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function adminLogin(data: {
  email: string
  password: string
}): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (signInError || !authData.user) {
    return { error: "Nieprawidłowy email lub hasło." }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single()

  if (profile?.role !== "admin") {
    await supabase.auth.signOut()
    return { error: "Brak uprawnień administratora." }
  }

  redirect("/dashboard/admin")
}
