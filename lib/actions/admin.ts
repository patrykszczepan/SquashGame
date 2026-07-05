"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Brak autoryzacji.", supabase: null }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin") return { error: "Brak uprawnień admina.", supabase: null }
  return { error: null, supabase }
}

export async function getAdminStats() {
  const { error, supabase } = await assertAdmin()
  if (error || !supabase) return null

  const [
    { count: centers },
    { count: players },
    { count: competitions },
    { count: matches },
  ] = await Promise.all([
    supabase.from("centers").select("*", { count: "exact", head: true }),
    supabase.from("players").select("*", { count: "exact", head: true }),
    supabase.from("competitions").select("*", { count: "exact", head: true }),
    supabase.from("matches").select("*", { count: "exact", head: true }),
  ])

  return { centers: centers ?? 0, players: players ?? 0, competitions: competitions ?? 0, matches: matches ?? 0 }
}

// ---- Centers ----

export async function blockCenter(centerId: string, reason: string) {
  const { error, supabase } = await assertAdmin()
  if (error || !supabase) return { error }

  const { error: err } = await supabase
    .from("centers")
    .update({
      is_active: false,
      blocked_at: new Date().toISOString(),
      blocked_reason: reason,
    })
    .eq("id", centerId)

  if (err) return { error: err.message }
  revalidatePath("/dashboard/admin/centers")
  return {}
}

export async function unblockCenter(centerId: string) {
  const { error, supabase } = await assertAdmin()
  if (error || !supabase) return { error }

  const { error: err } = await supabase
    .from("centers")
    .update({ is_active: true, blocked_at: null, blocked_reason: null })
    .eq("id", centerId)

  if (err) return { error: err.message }
  revalidatePath("/dashboard/admin/centers")
  return {}
}

// ---- Scoring Templates ----

export async function getScoringTemplates() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("scoring_templates")
    .select("id, name, description, config, is_global, center_id, created_at")
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function createScoringTemplate(form: {
  name: string
  description?: string
  config: object
  is_global?: boolean
}) {
  const { error, supabase } = await assertAdmin()
  if (error || !supabase) return { error }

  const { data, error: err } = await supabase
    .from("scoring_templates")
    .insert({
      name: form.name,
      description: form.description ?? null,
      config: form.config,
      is_global: form.is_global ?? true,
      center_id: null,
    })
    .select("id")
    .single()

  if (err) return { error: err.message }
  revalidatePath("/dashboard/admin/scoring-templates")
  return { id: data.id }
}

export async function updateScoringTemplate(
  id: string,
  form: { name?: string; description?: string; config?: object }
) {
  const { error, supabase } = await assertAdmin()
  if (error || !supabase) return { error }

  const { error: err } = await supabase
    .from("scoring_templates")
    .update({
      ...form,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (err) return { error: err.message }
  revalidatePath("/dashboard/admin/scoring-templates")
  return {}
}

export async function deleteScoringTemplate(id: string) {
  const { error, supabase } = await assertAdmin()
  if (error || !supabase) return { error }

  const { error: err } = await supabase
    .from("scoring_templates")
    .delete()
    .eq("id", id)

  if (err) return { error: err.message }
  revalidatePath("/dashboard/admin/scoring-templates")
  return {}
}

// ---- Plans ----

export async function getPlans() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("plans")
    .select("id, name, max_active_competitions, max_players, sms_enabled, custom_branding, price_monthly, is_active, created_at")
    .order("price_monthly", { ascending: true, nullsFirst: false })
  return data ?? []
}

export async function createPlan(form: {
  name: string
  max_active_competitions?: number | null
  max_players?: number | null
  sms_enabled?: boolean
  custom_branding?: boolean
  price_monthly?: number | null
}) {
  const { error, supabase } = await assertAdmin()
  if (error || !supabase) return { error }

  const { data, error: err } = await supabase
    .from("plans")
    .insert({
      name: form.name,
      max_active_competitions: form.max_active_competitions ?? null,
      max_players: form.max_players ?? null,
      sms_enabled: form.sms_enabled ?? false,
      custom_branding: form.custom_branding ?? false,
      price_monthly: form.price_monthly ?? null,
      is_active: true,
    })
    .select("id")
    .single()

  if (err) return { error: err.message }
  revalidatePath("/dashboard/admin/plans")
  return { id: data.id }
}

export async function updatePlan(id: string, form: {
  name?: string
  max_active_competitions?: number | null
  max_players?: number | null
  sms_enabled?: boolean
  custom_branding?: boolean
  price_monthly?: number | null
  is_active?: boolean
}) {
  const { error, supabase } = await assertAdmin()
  if (error || !supabase) return { error }

  const { error: err } = await supabase
    .from("plans")
    .update(form)
    .eq("id", id)

  if (err) return { error: err.message }
  revalidatePath("/dashboard/admin/plans")
  return {}
}
