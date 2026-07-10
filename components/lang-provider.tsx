"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DEFAULT_LANG, LANGS, LANG_COOKIE, type Lang } from "@/lib/i18n"

type LangContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangContextValue | null>(null)

// Read the lang cookie on the client so the first client render matches the
// server render (cookie is set before any RSC runs). Avoids hydration mismatch.
function readCookieLang(): Lang {
  if (typeof document === "undefined") return DEFAULT_LANG
  const match = document.cookie.match(/(?:^|;\s*)pos_lang=([^;]+)/)
  const value = match?.[1]
  return (LANGS as readonly string[]).includes(value ?? "") ? (value as Lang) : DEFAULT_LANG
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>(readCookieLang)

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next)
      document.cookie = `${LANG_COOKIE}=${next}; max-age=31536000; path=/; samesite=lax`
      // Re-fetch server components so RSC strings pick up the new lang.
      router.refresh()
    },
    [router]
  )

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error("useLang must be used within <LangProvider>")
  return ctx
}
