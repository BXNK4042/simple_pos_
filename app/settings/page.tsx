import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, requireRole } from "@/lib/auth"
import { ChangeEmailForm, ChangePasswordForm } from "./forms"

export const metadata: Metadata = {
  title: "Settings",
}

export default async function SettingsPage() {
  await requireRole("owner")
  const user = await getCurrentUser()
  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8" id="main">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your owner account.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <Card className="shadow-sm shadow-primary/5">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <Card className="shadow-sm shadow-primary/5">
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
