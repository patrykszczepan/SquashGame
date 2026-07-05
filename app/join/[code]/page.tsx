import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { joinCompetitionByCode } from "@/lib/actions/competitions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Validate invitation token
  const { data: token } = await supabase
    .from("invitation_tokens")
    .select("id, competition_id, competitions(name, centers(name)), max_uses, used_count, expires_at, revoked_at")
    .eq("code", code)
    .single()

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle>Nieprawidłowe zaproszenie</CardTitle>
            <CardDescription>Ten link zaproszenia jest nieważny lub wygasł.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Wróć do strony głównej</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isExpired = token.expires_at && new Date(token.expires_at) < new Date()
  const isRevoked = !!token.revoked_at
  const isUsedUp = token.max_uses !== null && token.used_count >= token.max_uses

  if (isExpired || isRevoked || isUsedUp) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle>Link wygasł</CardTitle>
            <CardDescription>
              Ten link zaproszenia nie jest już aktywny. Poproś organizatora o nowy link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Wróć do strony głównej</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const comp = token.competitions as any
  const centerName = comp?.centers?.name ?? "centrum squash"
  const compName = comp?.name ?? "rozgrywki"

  // Not logged in — send to register, preserve code in URL
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle>Dołącz do rozgrywek</CardTitle>
            <CardDescription>
              Zostałeś zaproszony do <strong>{compName}</strong> organizowanych przez{" "}
              <strong>{centerName}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href={`/register?role=player&join=${code}`}>
                Zarejestruj się i dołącz
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/login?join=${code}`}>
                Mam już konto — zaloguj się
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Logged in — check if player profile exists
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("id", user.id)
    .single()

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle>Profil zawodnika wymagany</CardTitle>
            <CardDescription>
              Aby dołączyć do rozgrywek, musisz mieć profil zawodnika.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/onboarding/player">Utwórz profil zawodnika</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if already in this competition
  const { data: existing } = await supabase
    .from("competition_players")
    .select("id, invitation_status")
    .eq("competition_id", token.competition_id)
    .eq("profile_id", user.id)
    .single()

  if (existing?.invitation_status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle>Już jesteś w rozgrywkach</CardTitle>
            <CardDescription>
              Jesteś już uczestnikiem rozgrywek <strong>{compName}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/player/leagues">Przejdź do moich lig</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Auto-join via server action form
  async function handleJoin() {
    "use server"
    const result = await joinCompetitionByCode(code)
    if (!result.error) {
      redirect("/dashboard/player/leagues")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-sm w-full">
        <CardHeader>
          <CardTitle>Dołącz do rozgrywek</CardTitle>
          <CardDescription>
            Zostałeś zaproszony do <strong>{compName}</strong> organizowanych przez{" "}
            <strong>{centerName}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleJoin} className="space-y-3">
            <Button type="submit" className="w-full">
              Dołącz do rozgrywek
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/player">Nie teraz</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
