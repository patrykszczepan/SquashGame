"use client"

import { useState } from "react"
import { setupTestAccounts } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X, Loader2 } from "lucide-react"

const ACCOUNTS = [
  {
    label: "Super Admin",
    email: "superadmin@squashleague.test",
    role: "super_admin",
    loginUrl: "/login",
    dashboardUrl: "/dashboard/admin",
  },
  {
    label: "Centrum squash",
    email: "centrum@squashleague.test",
    role: "center",
    loginUrl: "/login",
    dashboardUrl: "/dashboard/center",
  },
  {
    label: "Zawodnik",
    email: "zawodnik@squashleague.test",
    role: "player",
    loginUrl: "/login",
    dashboardUrl: "/dashboard/player",
  },
]

const PASSWORD = "Test1234!"

export function SetupForm() {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ email: string; status: string; error?: string }[] | null>(null)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  async function handleSetup() {
    setLoading(true)
    setError("")
    const res = await setupTestAccounts(password)
    if (res.error) {
      setError(res.error)
    } else if (res.results) {
      setResults(res.results)
      setDone(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dev Setup — Konta testowe</h1>
          <p className="text-muted-foreground text-sm mt-1">Jednorazowe tworzenie kont testowych w środowisku deweloperskim.</p>
        </div>

        {!done ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Konta do utworzenia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {ACCOUNTS.map((a) => (
                  <div key={a.email} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                    <div>
                      <span className="font-medium">{a.label}</span>
                      <span className="text-muted-foreground ml-2">{a.email}</span>
                    </div>
                    <Badge variant="outline">{a.role}</Badge>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-1">
                  Hasło dla wszystkich kont: <code className="font-mono bg-muted px-1 rounded">{PASSWORD}</code>
                </p>
              </div>

              <div className="space-y-1">
                <Label>Hasło dostępu do tej strony</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="squash-dev-2024"
                  onKeyDown={(e) => e.key === "Enter" && handleSetup()}
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive whitespace-pre-wrap">
                  {error}
                </div>
              )}

              <Button onClick={handleSetup} disabled={loading || !password} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? "Tworzenie kont..." : "Utwórz konta testowe"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Wynik</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results?.map((r) => (
                  <div key={r.email} className="flex items-center gap-3 text-sm">
                    {r.error ? (
                      <X className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                    )}
                    <span className="font-mono text-xs">{r.email}</span>
                    <span className="text-muted-foreground">{r.status}</span>
                    {r.error && <span className="text-destructive text-xs">{r.error}</span>}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h2 className="font-semibold">Zaloguj się jako:</h2>
              {ACCOUNTS.map((a) => (
                <Card key={a.email}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{a.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{a.email}</p>
                      <p className="text-xs text-muted-foreground font-mono">{PASSWORD}</p>
                    </div>
                    <a
                      href={a.loginUrl}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
                    >
                      Zaloguj
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {done && (
          <div className="rounded-md bg-muted p-4 text-sm space-y-1">
            <p className="font-medium">Możesz też wrócić tu w każdej chwili pod adresem:</p>
            <code className="text-xs">/dev/setup</code>
            <p className="text-muted-foreground text-xs">
              Strona jest dostępna tylko gdy w kodzie działa serwer deweloperski lub gdy środowisko Vercel nie ma
              ustawionego NODE_ENV=production z ochroną.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
