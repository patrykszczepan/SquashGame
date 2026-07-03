import { createBrowserClient } from "@supabase/ssr"

function cleanEnv(value: string): string {
  return value.replace(/﻿/g, "").trim()
}

export function createClient() {
  return createBrowserClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  )
}
