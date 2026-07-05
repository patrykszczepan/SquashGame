"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updatePlayerProfile(data: {
  first_name: string
  last_name: string
  phone: string
}): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nie jesteś zalogowany." }

  const { error } = await supabase
    .from("players")
    .update({
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone: data.phone.trim() || null,
    })
    .eq("profile_id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/dashboard/player")
  return { success: true }
}

export async function updateEmail(newEmail: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) return { error: error.message }
  return { success: true }
}

export async function updatePassword(data: {
  currentPassword: string
  newPassword: string
}): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: "Brak danych użytkownika." }

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: data.currentPassword,
  })
  if (signInErr) return { error: "Nieprawidłowe aktualne hasło." }

  const { error } = await supabase.auth.updateUser({ password: data.newPassword })
  if (error) return { error: error.message }
  return { success: true }
}
