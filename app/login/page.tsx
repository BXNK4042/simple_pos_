import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Sign in | POS System",
}

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) {
    redirect(user.role === "owner" ? "/" : "/cashier")
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use your POS account to continue.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
