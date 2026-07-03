import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-semibold">Dashboard</h1>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 rounded-xl aspect-video flex items-center justify-center text-muted-foreground text-sm">
              Nadchodzące mecze
            </div>
            <div className="bg-muted/50 rounded-xl aspect-video flex items-center justify-center text-muted-foreground text-sm">
              Ranking
            </div>
            <div className="bg-muted/50 rounded-xl aspect-video flex items-center justify-center text-muted-foreground text-sm">
              Statystyki
            </div>
          </div>
          <div className="bg-muted/50 rounded-xl min-h-[60vh] flex items-center justify-center text-muted-foreground text-sm">
            Główna treść
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
