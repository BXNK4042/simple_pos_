import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, requireRole } from "@/lib/auth"
import { ChangeEmailForm, ChangePasswordForm } from "./forms"

export const metadata: Metadata = {
  title: "Settings | POS System",
}

export default async function SettingsPage() {
  await requireRole("owner")
  const user = await getCurrentUser()
  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/" aria-label="Back home">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your owner account.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change email</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangeEmailForm currentEmail={user.email} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
