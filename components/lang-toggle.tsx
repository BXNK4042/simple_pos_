"use client"

import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LANGS, type Lang } from "@/lib/i18n"
import { useLang } from "@/components/lang-provider"

const LABELS: Record<Lang, string> = {
  en: "English",
  th: "ภาษาไทย",
}

export function LangToggle() {
  const { lang, setLang } = useLang()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Toggle language">
          <Languages />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGS.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLang(code)}
            className={lang === code ? "font-semibold" : ""}
          >
            {LABELS[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
