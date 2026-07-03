"use client"

import {
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  BarChart3,
  Settings,
  ChevronUp,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "#" },
  { title: "Mecze", icon: Trophy, url: "#" },
  { title: "Gracze", icon: Users, url: "#" },
  { title: "Terminarz", icon: Calendar, url: "#" },
  { title: "Statystyki", icon: BarChart3, url: "#" },
  { title: "Ustawienia", icon: Settings, url: "#" },
]

export function AppSidebar() {
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
                    <AvatarImage src="/avatar.png" alt="Patryk" />
                    <AvatarFallback className="rounded-lg">PS</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Patryk</span>
                    <span className="truncate text-xs text-muted-foreground">
                      patryk.szczepanski@gmail.com
                    </span>
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
                <DropdownMenuItem className="text-destructive">
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
