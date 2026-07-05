"use client"

import { useState } from "react"
import { createInvitationLink } from "@/lib/actions/competitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link2, Copy, Check } from "lucide-react"

export function CreateInvitationButton({ competitionId }: { competitionId: string }) {
  const [loading, setLoading] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setLoading(true)
    setError(null)
    const result = await createInvitationLink(competitionId)
    if (result.error) {
      setError(result.error)
    } else if (result.code) {
      setLink(`${window.location.origin}/join/${result.code}`)
    }
    setLoading(false)
  }

  async function handleCopy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (link) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Link do dołączenia:</p>
        <div className="flex gap-2">
          <Input value={link} readOnly className="text-xs h-8" />
          <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={handleCreate}
        disabled={loading}
      >
        <Link2 className="h-4 w-4 mr-2" />
        {loading ? "Generowanie..." : "Wygeneruj link zaproszenia"}
      </Button>
    </div>
  )
}
