"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createPlan, updatePlan } from "@/lib/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Pencil, Plus, Check, X } from "lucide-react"

interface Plan {
  id: string
  name: string
  max_active_competitions: number | null
  max_players: number | null
  sms_enabled: boolean
  custom_branding: boolean
  price_monthly: number | null
}

function PlanForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Plan>
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [maxComp, setMaxComp] = useState(initial?.max_active_competitions?.toString() ?? "")
  const [maxPlayers, setMaxPlayers] = useState(initial?.max_players?.toString() ?? "")
  const [sms, setSms] = useState(initial?.sms_enabled ?? false)
  const [branding, setBranding] = useState(initial?.custom_branding ?? false)
  const [price, setPrice] = useState(initial?.price_monthly?.toString() ?? "")
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    await onSave({
      name,
      max_active_competitions: maxComp ? parseInt(maxComp) : null,
      max_players: maxPlayers ? parseInt(maxPlayers) : null,
      sms_enabled: sms,
      custom_branding: branding,
      price_monthly: price ? parseFloat(price) : null,
    })
    setLoading(false)
  }

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder?: string) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "bez limitu"} />
    </div>
  )

  const toggle = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <div className="flex items-center gap-2">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      <Label>{label}</Label>
    </div>
  )

  return (
    <div className="space-y-4">
      {field("Nazwa planu", name, setName, "np. Pro")}
      {field("Maks. aktywnych rozgrywek", maxComp, setMaxComp)}
      {field("Maks. zawodników", maxPlayers, setMaxPlayers)}
      {field("Cena miesięczna (PLN)", price, setPrice, "0 = bezpłatny")}
      {toggle("SMS włączone", sms, setSms)}
      {toggle("Własny branding", branding, setBranding)}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Anuluj</Button>
        <Button onClick={handle} disabled={loading || !name}>
          {loading ? "..." : "Zapisz"}
        </Button>
      </div>
    </div>
  )
}

export function PlansManager({ plans }: { plans: Plan[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  async function handleCreate(data: any) {
    await createPlan(data)
    setCreateOpen(false)
    router.refresh()
  }

  async function handleUpdate(id: string, data: any) {
    await updatePlan(id, data)
    setEditId(null)
    router.refresh()
  }

  const bool = (v: boolean) =>
    v ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nowy plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nowy plan</DialogTitle></DialogHeader>
            <PlanForm onSave={handleCreate} onCancel={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Brak planów.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Nazwa</th>
                <th className="pb-2 pr-4 font-medium">Rozgrywki</th>
                <th className="pb-2 pr-4 font-medium">Zawodnicy</th>
                <th className="pb-2 pr-4 font-medium">SMS</th>
                <th className="pb-2 pr-4 font-medium">Branding</th>
                <th className="pb-2 pr-4 font-medium">Cena/mies.</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{p.name}</td>
                  <td className="py-3 pr-4">{p.max_active_competitions ?? "∞"}</td>
                  <td className="py-3 pr-4">{p.max_players ?? "∞"}</td>
                  <td className="py-3 pr-4">{bool(p.sms_enabled)}</td>
                  <td className="py-3 pr-4">{bool(p.custom_branding)}</td>
                  <td className="py-3 pr-4">
                    {p.price_monthly != null ? `${p.price_monthly} PLN` : "—"}
                  </td>
                  <td className="py-3">
                    <Dialog
                      open={editId === p.id}
                      onOpenChange={(o) => setEditId(o ? p.id : null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Edytuj plan</DialogTitle></DialogHeader>
                        <PlanForm
                          initial={p}
                          onSave={(data) => handleUpdate(p.id, data)}
                          onCancel={() => setEditId(null)}
                        />
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
