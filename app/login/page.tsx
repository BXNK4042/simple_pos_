import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Banknote } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) {
    redirect(user.role === "owner" ? "/" : "/cashier")
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-lg shadow-brand/30">
            <Banknote className="size-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use your POS account to continue.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-lg shadow-primary/5">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
