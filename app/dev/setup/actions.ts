"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const TEST_PASSWORD = "Test1234!"

const ACCOUNTS = [
  {
    email: "superadmin@squashleague.test",
    role: "super_admin" as const,
    first_name: "Super",
    last_name: "Admin",
  },
  {
    email: "centrum@squashleague.test",
    role: "center" as const,
    first_name: "Jan",
    last_name: "Kowalski",
    center_name: "Centrum Squash Testowy",
    center_city: "Warszawa",
  },
  {
    email: "zawodnik@squashleague.test",
    role: "player" as const,
    first_name: "Piotr",
    last_name: "Nowak",
    phone: "600100200",
  },
]

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
}

export async function setupTestAccounts(password: string) {
  if (password !== process.env.DEV_SETUP_PASSWORD && password !== "squash-dev-2024") {
    return { error: "Nieprawidłowe hasło dostępu." }
  }

  const admin = getAdminClient()
  if (!admin) {
    return {
      error:
        "Brak SUPABASE_SERVICE_ROLE_KEY w .env.local. Dodaj: SUPABASE_SERVICE_ROLE_KEY=<klucz ze Supabase Dashboard → Settings → API>",
    }
  }

  const results: Array<{ email: string; status: string; details: string[] }> = []

  for (const acc of ACCOUNTS) {
    const details: string[] = []

    // Check if user already exists
    const { data: existingList } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const exists = existingList?.users?.find((u) => u.email === acc.email)

    let userId: string

    if (exists) {
      userId = exists.id
      details.push(`Auth user OK (id: ${userId.slice(0, 8)}...)`)
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: acc.email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { role: acc.role },
      })

      if (createErr || !created.user) {
        results.push({ email: acc.email, status: "błąd auth", details: [createErr?.message ?? "unknown"] })
        continue
      }
      userId = created.user.id
      details.push(`Auth user created (id: ${userId.slice(0, 8)}...)`)
    }

    // Force-update profile (delete + insert to bypass constraint issues)
    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: userId,
        role: acc.role,
        first_name: acc.first_name,
        last_name: acc.last_name,
      },
      { onConflict: "id" }
    )
    if (profileErr) {
      details.push(`Profile ERROR: ${profileErr.message} (code: ${profileErr.code})`)
    } else {
      details.push(`Profile OK (role: ${acc.role})`)
    }

    // Role-specific setup
    if (acc.role === "center" && "center_name" in acc) {
      const slug = slugify(acc.center_name) + "-test"
      const { error: centerErr } = await admin.from("centers").upsert(
        {
          profile_id: userId,
          name: acc.center_name,
          slug,
          city: acc.center_city,
          is_active: true,
        },
        { onConflict: "profile_id" }
      )
      if (centerErr) {
        details.push(`Center ERROR: ${centerErr.message}`)
      } else {
        details.push(`Center OK (slug: ${slug})`)
      }
    }

    if (acc.role === "player" && "phone" in acc) {
      const { error: playerErr } = await admin.from("players").upsert(
        {
          profile_id: userId,
          first_name: acc.first_name,
          last_name: acc.last_name,
          phone: acc.phone,
        },
        { onConflict: "profile_id" }
      )
      if (playerErr) {
        details.push(`Player ERROR: ${playerErr.message}`)
      } else {
        details.push(`Player record OK`)
      }
    }

    const hasError = details.some((d) => d.includes("ERROR"))
    results.push({ email: acc.email, status: hasError ? "częściowy błąd" : "OK", details })
  }

  return { results }
}
