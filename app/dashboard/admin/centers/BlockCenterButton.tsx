"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { blockCenter, unblockCenter } from "@/lib/actions/admin"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldOff, ShieldCheck } from "lucide-react"

export function BlockCenterButton({
  centerId,
  isBlocked,
}: {
  centerId: string
  isBlocked: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleBlock() {
    setLoading(true)
    const res = await blockCenter(centerId, reason)
    if (res?.error) { setError(res.error); setLoading(false) }
    else { setOpen(false); router.refresh() }
  }

  async function handleUnblock() {
    setLoading(true)
    const res = await unblockCenter(centerId)
    if (res?.error) { setError(res.error); setLoading(false) }
    else router.refresh()
  }

  if (isBlocked) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="text-green-600 border-green-300 hover:bg-green-50"
        onClick={handleUnblock}
        disabled={loading}
      >
        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
        {loading ? "..." : "Odblokuj"}
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/5"
        >
          <ShieldOff className="h-3.5 w-3.5 mr-1" />
          Zablokuj
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zablokuj centrum</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Powód blokady</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="np. naruszenie regulaminu"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
            <Button
              variant="destructive"
              onClick={handleBlock}
              disabled={loading || !reason}
            >
              {loading ? "..." : "Zablokuj centrum"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
