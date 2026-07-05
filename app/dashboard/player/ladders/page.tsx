import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getMyLadders, getMyChallenges } from "@/lib/actions/ladders"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChallengePanel } from "./ChallengePanel"
import { AcceptDeclineButtons } from "./AcceptDeclineButtons"

export default async function PlayerLaddersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [myLadders, myChallenges] = await Promise.all([
    getMyLadders(),
    getMyChallenges(),
  ])

  const ladderEntries = (myLadders as any[])
  const challenges = (myChallenges as any[])
  const pendingCount = challenges.filter((c) => c.status === "pending").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Drabinki challenge</h1>
        <p className="text-muted-foreground">Twoje pozycje i aktywne wyzwania.</p>
      </div>

      <Tabs defaultValue="ladders">
        <TabsList>
          <TabsTrigger value="ladders">Moje drabinki ({ladderEntries.length})</TabsTrigger>
          <TabsTrigger value="challenges">
            Wyzwania
            {pendingCount > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground rounded-full px-1.5 text-xs">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ladders" className="mt-4 space-y-4">
          {ladderEntries.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nie jesteś w żadnej drabince challenge.
              </CardContent>
            </Card>
          ) : (
            ladderEntries.map((entry) => {
              const ladder = entry.ladders as any
              const comp = ladder?.competitions as any
              const allPositions = ((ladder?.ladder_positions ?? []) as any[]).sort(
                (a: any, b: any) => a.position - b.position
              )
              return (
                <Card key={entry.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{ladder?.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {comp?.name} · {comp?.centers?.name}
                        </p>
                      </div>
                      <div className="text-3xl font-bold text-primary">#{entry.position}</div>
                    </div>
                    {entry.previous_position && entry.previous_position !== entry.position && (
                      <p className="text-xs text-muted-foreground">
                        Poprzednio: #{entry.previous_position}
                        {entry.position < entry.previous_position ? (
                          <span className="text-green-600 ml-1">▲ awans</span>
                        ) : (
                          <span className="text-red-600 ml-1">▼ spadek</span>
                        )}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ChallengePanel
                      ladderId={ladder.id}
                      myPosition={entry.position}
                      myProfileId={user.id}
                      maxDistance={ladder.max_challenge_distance}
                      allPositions={allPositions}
                      protectedUntil={entry.protected_until}
                    />
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="challenges" className="mt-4 space-y-3">
          {challenges.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Brak aktywnych wyzwań.
              </CardContent>
            </Card>
          ) : (
            challenges.map((c) => {
              const ladder = c.ladders as any
              const comp = ladder?.competitions as any
              const isChallenger = c.challenger_id === user.id
              const challengerName = c.challenger
                ? `${c.challenger.first_name} ${c.challenger.last_name}`
                : "?"
              const challengedName = c.challenged
                ? `${c.challenged.first_name} ${c.challenged.last_name}`
                : "?"
              return (
                <Card
                  key={c.id}
                  className={
                    !isChallenger && c.status === "pending"
                      ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                      : ""
                  }
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {challengerName} wyzwał {challengedName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ladder?.name} · {comp?.name} · Deadline:{" "}
                          {new Date(c.deadline).toLocaleDateString("pl")}
                        </p>
                      </div>
                      <Badge variant={c.status === "pending" ? "outline" : "secondary"}>
                        {c.status === "pending" ? "Oczekuje" : "Zaakceptowane"}
                      </Badge>
                    </div>
                    {!isChallenger && c.status === "pending" && (
                      <AcceptDeclineButtons challengeId={c.id} />
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
