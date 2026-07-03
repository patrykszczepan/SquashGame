import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const skillLabels: Record<string, string> = {
  beginner: "Początkujący",
  intermediate: "Średniozaawansowany",
  advanced: "Zaawansowany",
}

export default async function AdminPlayersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Zawodnicy</h1>
        <p className="text-muted-foreground">{players?.length ?? 0} zarejestrowanych</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imię i nazwisko</TableHead>
              <TableHead>Poziom</TableHead>
              <TableHead>Data rejestracji</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Brak zarejestrowanych zawodników
                </TableCell>
              </TableRow>
            )}
            {players?.map((player) => (
              <TableRow key={player.id}>
                <TableCell className="font-medium">
                  {player.first_name} {player.last_name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {skillLabels[player.skill_level] ?? player.skill_level}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(player.created_at).toLocaleDateString("pl-PL")}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">aktywny</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
