"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function loginAction(data: {
  email: string
  password: string
  joinCode?: string
}): Promise<{ error: string } | void> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    return { error: "Nieprawidłowy email lub hasło." }
  }

  if (data.joinCode) {
    redirect(`/join/${data.joinCode}`)
  }
  redirect("/dashboard")
}
