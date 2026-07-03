"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Building2 } from "lucide-react"
import { selectRole } from "./actions"

export default function SelectRolePage() {
  const [loading, setLoading] = useState<"player" | "center" | null>(null)
  const [error, setError] = useState("")

  async function handleSelect(role: "player" | "center") {
    setError("")
    setLoading(role)
    const result = await selectRole(role)
    if (result?.error) {
      setError(result.error)
      setLoading(null)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Wybierz typ konta</h1>
          <p className="text-muted-foreground text-sm">Zalogowałeś się przez Google — wybierz, kim jesteś</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleSelect("player")}
          >
            <CardHeader className="items-center pb-2">
              <div className="rounded-full bg-primary/10 p-4">
                <User className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-base">Zawodnik</CardTitle>
              <CardDescription className="text-center text-xs">Gram w squasha, szukam kortów i turniejów</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={loading !== null} onClick={() => handleSelect("player")}>
                {loading === "player" ? "..." : "Wybierz"}
              </Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleSelect("center")}
          >
            <CardHeader className="items-center pb-2">
              <div className="rounded-full bg-primary/10 p-4">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-base">Centrum</CardTitle>
              <CardDescription className="text-center text-xs">Prowadzę centrum squash, zarządzam kortami</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={loading !== null} onClick={() => handleSelect("center")}>
                {loading === "center" ? "..." : "Wybierz"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
