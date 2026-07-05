import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users } from "lucide-react"
import Link from "next/link"
import { AddPlayerDialog } from "./AddPlayerDialog"
import { GuestPlayersTable } from "./GuestPlayersTable"
import { AssignToCompetitionDialog } from "./AssignToCompetitionDialog"

export default async function CenterPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!center) redirect("/dashboard/center")

  const { data: comps } = await supabase
    .from("competitions")
    .select("id, name")
    .eq("center_id", center.id)
  const compIds = comps?.map((c) => c.id) ?? []
  const compMap = new Map(comps?.map((c) => [c.id, c]) ?? [])

  // Registered players (with accounts)
  const { data: competitionPlayersRaw } = await supabase
    .from("competition_players")
    .select("profile_id, competition_id, invitation_status, players!inner(first_name, last_name, phone)")
    .in("competition_id", compIds.length > 0 ? compIds : ["00000000-0000-0000-0000-000000000000"])

  // Group by profile_id
  const playerMap = new Map<string, {
    profile_id: string
    first_name: string
    last_name: string
    phone: string | null
    competitions: { id: string; name: string; status: string }[]
  }>()

  for (const cp of competitionPlayersRaw ?? []) {
    const player = cp.players as any
    const comp = compMap.get(cp.competition_id)
    if (!comp) continue
    const existing = playerMap.get(cp.profile_id)
    if (existing) {
      existing.competitions.push({ id: cp.competition_id, name: comp.name, status: cp.invitation_status })
    } else {
      playerMap.set(cp.profile_id, {
        profile_id: cp.profile_id,
        first_name: player.first_name,
        last_name: player.last_name,
        phone: player.phone ?? null,
        competitions: [{ id: cp.competition_id, name: comp.name, status: cp.invitation_status }],
      })
    }
  }

  // Guest players (without accounts) — center_players
  const { data: guestPlayersRaw } = await supabase
    .from("center_players")
    .select("*")
    .eq("center_id", center.id)
    .order("last_name")

  const search = q?.trim().toLowerCase() ?? ""

  let registeredPlayers = Array.from(playerMap.values()).sort((a, b) =>
    a.last_name.localeCompare(b.last_name, "pl")
  )
  let guestPlayers = guestPlayersRaw ?? []

  if (search) {
    registeredPlayers = registeredPlayers.filter(
      (p) =>
        p.first_name.toLowerCase().includes(search) ||
        p.last_name.toLowerCase().includes(search) ||
        (p.phone ?? "").includes(search)
    )
    guestPlayers = guestPlayers.filter(
      (p) =>
        p.first_name.toLowerCase().includes(search) ||
        p.last_name.toLowerCase().includes(search) ||
        (p.email ?? "").toLowerCase().includes(search) ||
        (p.phone ?? "").includes(search)
    )
  }

  const accepted = registeredPlayers.filter((p) =>
    p.competitions.some((c) => c.status === "accepted")
  )
  const pending = registeredPlayers.filter((p) =>
    p.competitions.every((c) => c.status !== "accepted")
  )

  const totalCount = registeredPlayers.length + guestPlayers.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Zawodnicy</h1>
          <p className="text-muted-foreground">
            {totalCount} {totalCount === 1 ? "zawodnik" : "zawodników"} łącznie
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(comps?.length ?? 0) > 0 && (
            <AssignToCompetitionDialog competitions={comps ?? []} />
          )}
          <AddPlayerDialog />
        </div>
      </div>

      {/* Search */}
      <form method="GET">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Szukaj po nazwisku, imieniu, e-mailu lub telefonie..."
          className="max-w-sm"
        />
      </form>

      {/* Registered players — accepted */}
      {accepted.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Aktywni zawodnicy ({accepted.length})
          </h2>
          <RegisteredTable players={accepted} />
        </section>
      )}

      {/* Registered players — pending */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Oczekujący na akceptację ({pending.length})
          </h2>
          <RegisteredTable players={pending} dimmed />
        </section>
      )}

      {/* Guest players */}
      {guestPlayers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Zawodnicy bez konta ({guestPlayers.length})
          </h2>
          <GuestPlayersTable players={guestPlayers as any[]} />
        </section>
      )}

      {/* Empty state */}
      {totalCount === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            {search ? (
              <p>Brak wyników dla podanej frazy.</p>
            ) : compIds.length === 0 ? (
              <>
                <p className="mb-2">Brak rozgrywek i zawodników.</p>
                <Link href="/dashboard/center/competitions/new" className="text-sm text-primary hover:underline">
                  Utwórz pierwszą rozgrywkę →
                </Link>
              </>
            ) : (
              <p>Brak zawodników. Użyj przycisku "Dodaj zawodnika" lub zaproś przez link.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function RegisteredTable({
  players,
  dimmed = false,
}: {
  players: {
    profile_id: string
    first_name: string
    last_name: string
    phone: string | null
    competitions: { id: string; name: string; status: string }[]
  }[]
  dimmed?: boolean
}) {
  return (
    <Card className={`py-0${dimmed ? " opacity-70" : ""}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Zawodnik</th>
              <th className="px-4 py-3 text-left font-medium">Telefon</th>
              <th className="px-4 py-3 text-left font-medium">Rozgrywki</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.profile_id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{p.last_name} {p.first_name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.phone ?? <span className="opacity-40">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.competitions.map((c) => (
                      <Badge
                        key={c.id}
                        variant={c.status === "accepted" ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
