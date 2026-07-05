"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  Trophy,
  Users,
  BarChart3,
  Settings,
  Building2,
  ChevronUp,
  LogOut,
  ClipboardList,
  PenLine,
  Medal,
  CreditCard,
  Swords,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"

interface AppSidebarProps {
  role?: "center" | "player" | "super_admin"
  displayName: string
  email: string
}

export function AppSidebar({ role, displayName, email }: AppSidebarProps) {
  const router = useRouter()
  const tNav = useTranslations("nav")
  const tUser = useTranslations("nav.user")

  const centerNav = [
    { title: tNav("center.dashboard"), icon: LayoutDashboard, url: "/dashboard/center" },
    { title: tNav("center.competitions"), icon: Trophy, url: "/dashboard/center/competitions" },
    { title: tNav("center.players"), icon: Users, url: "/dashboard/center/players" },
    { title: tNav("center.results"), icon: PenLine, url: "/dashboard/center/results" },
    { title: tNav("center.rankings"), icon: BarChart3, url: "/dashboard/center/rankings" },
    { title: tNav("center.settings"), icon: Settings, url: "/dashboard/center/settings" },
  ]

  const playerNav = [
    { title: tNav("player.dashboard"), icon: LayoutDashboard, url: "/dashboard/player" },
    { title: tNav("player.myLeagues"), icon: ClipboardList, url: "/dashboard/player/leagues" },
    { title: tNav("player.matches"), icon: Trophy, url: "/dashboard/player/matches" },
    { title: tNav("player.tournaments"), icon: Trophy, url: "/dashboard/player/tournaments" },
    { title: tNav("player.ladders"), icon: Swords, url: "/dashboard/player/ladders" },
    { title: tNav("player.ranking"), icon: Medal, url: "/dashboard/player/ranking" },
    { title: tNav("player.settings"), icon: Settings, url: "/dashboard/player/settings" },
  ]

  const adminNav = [
    { title: tNav("admin.dashboard"), icon: LayoutDashboard, url: "/dashboard/admin" },
    { title: tNav("admin.centers"), icon: Building2, url: "/dashboard/admin/centers" },
    { title: tNav("admin.players"), icon: Users, url: "/dashboard/admin/players" },
    { title: tNav("admin.scoringTemplates"), icon: ClipboardList, url: "/dashboard/admin/scoring-templates" },
    { title: tNav("admin.plans"), icon: CreditCard, url: "/dashboard/admin/plans" },
    { title: tNav("admin.settings"), icon: Settings, url: "/dashboard/admin/settings" },
  ]

  const navItems = role === "super_admin" ? adminNav : role === "center" ? centerNav : playerNav

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base font-semibold mb-2">
            SquashLeague
          </SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <a href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width]"
                side="top"
                align="start"
              >
                <DropdownMenuItem>{tUser("profile")}</DropdownMenuItem>
                <DropdownMenuItem>{tUser("accountSettings")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {tUser("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
