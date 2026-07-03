import Link from "next/link"
import { Building2, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Dołącz do SquashGame</h1>
          <p className="text-muted-foreground">Wybierz typ konta</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/register/center">
            <Card className="h-full cursor-pointer transition-colors hover:border-primary hover:bg-accent">
              <CardHeader className="items-center text-center pb-2">
                <div className="rounded-full bg-primary/10 p-4 mb-2">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Centrum squash</CardTitle>
                <CardDescription>
                  Zarządzaj kortami, grafikiem i rezerwacjami swojego centrum
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                Dla właścicieli i menedżerów centrów squash
              </CardContent>
            </Card>
          </Link>

          <Link href="/register/player">
            <Card className="h-full cursor-pointer transition-colors hover:border-primary hover:bg-accent">
              <CardHeader className="items-center text-center pb-2">
                <div className="rounded-full bg-primary/10 p-4 mb-2">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Zawodnik</CardTitle>
                <CardDescription>
                  Rezerwuj korty, śledź swoje mecze i ranking
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                Dla graczy squasha na każdym poziomie
              </CardContent>
            </Card>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Masz już konto?{" "}
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  )
}
