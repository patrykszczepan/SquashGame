import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = profile?.role as "center" | "player" | "super_admin" | undefined

  const headersList = await headers()
  const pathname = headersList.get("x-invoke-path") ?? headersList.get("next-url") ?? ""

  if (role !== "super_admin" && pathname.includes("/dashboard/admin")) {
    redirect("/dashboard")
  }

  let displayName = user.email ?? ""
  if (role === "center") {
    const { data: center } = await supabase
      .from("centers")
      .select("name")
      .eq("profile_id", user.id)
      .single()
    displayName = center?.name ?? displayName
  } else if (role === "player") {
    const { data: player } = await supabase
      .from("players")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single()
    if (player) displayName = `${player.first_name} ${player.last_name}`
  } else if (role === "super_admin") {
    displayName = "Super Admin"
  }

  return (
    <SidebarProvider>
      <AppSidebar role={role} displayName={displayName} email={user.email ?? ""} />
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
