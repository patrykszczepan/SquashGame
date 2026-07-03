"use client"

import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Building2,
  ChevronUp,
  LogOut,
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

const centerNav = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard/center" },
  { title: "Korty", icon: Building2, url: "/dashboard/center/courts" },
  { title: "Rezerwacje", icon: Calendar, url: "/dashboard/center/bookings" },
  { title: "Zawodnicy", icon: Users, url: "/dashboard/center/players" },
  { title: "Statystyki", icon: BarChart3, url: "/dashboard/center/stats" },
  { title: "Ustawienia", icon: Settings, url: "/dashboard/center/settings" },
]

const playerNav = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard/player" },
  { title: "Moje mecze", icon: Trophy, url: "/dashboard/player/matches" },
  { title: "Rezerwacje", icon: Calendar, url: "/dashboard/player/bookings" },
  { title: "Centra squash", icon: Building2, url: "/dashboard/player/centers" },
  { title: "Ranking", icon: BarChart3, url: "/dashboard/player/ranking" },
  { title: "Ustawienia", icon: Settings, url: "/dashboard/player/settings" },
]

interface AppSidebarProps {
  role?: "center" | "player"
  displayName: string
  email: string
}

export function AppSidebar({ role, displayName, email }: AppSidebarProps) {
  const router = useRouter()
  const navItems = role === "center" ? centerNav : playerNav
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
            SquashGame
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
                <DropdownMenuItem>Profil</DropdownMenuItem>
                <DropdownMenuItem>Ustawienia konta</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Wyloguj
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
