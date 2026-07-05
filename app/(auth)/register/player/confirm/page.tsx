import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function RegisterPlayerConfirmPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sprawdź skrzynkę email</CardTitle>
          <CardDescription>
            Rejestracja przebiegła pomyślnie. Wysłaliśmy link aktywacyjny na podany adres email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kliknij w link w emailu, aby aktywować konto i zalogować się.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Przejdź do logowania</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
