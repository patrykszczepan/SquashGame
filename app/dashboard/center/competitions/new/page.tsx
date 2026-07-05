"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { createCompetition } from "@/lib/actions/competitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function NewCompetitionPage() {
  const t = useTranslations("competitions")
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    description: "",
    visibility: "public",
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError(t("form.nameRequired")); return }
    setError("")
    setLoading(true)
    const result = await createCompetition(form)
    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(`/dashboard/center/competitions/${result.id}`)
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("new.title")}</h1>
        <p className="text-muted-foreground">{t("new.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("new.basicInfo")}</CardTitle>
          <CardDescription>{t("new.basicInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">
                {t("form.name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t("form.namePlaceholder")}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("form.description")}</Label>
              <Textarea
                id="description"
                placeholder={t("form.descriptionPlaceholder")}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visibility">{t("form.visibility")}</Label>
              <Select value={form.visibility} onValueChange={(v) => set("visibility", v)}>
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">{t("visibility.public")}</SelectItem>
                  <SelectItem value="private">{t("visibility.private")}</SelectItem>
                  <SelectItem value="mixed">{t("visibility.mixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? t("form.creating") : t("form.create")}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/center/competitions">{t("form.cancel")}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
