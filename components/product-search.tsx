"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Command as CommandPrimitive } from "cmdk"
import { ScanLine, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { formatTHB } from "@/lib/format"
import { isLow, isOut } from "@/lib/inventory"

export type ProductSearchHit = {
  id: number
  barcode: string
  name: string
  price: number
  stock: number
}

type SearchResponse = {
  status?: string
  message?: string
  items?: ProductSearchHit[]
}

type ProductSearchProps = {
  placeholder?: string
  submitLabel?: string
  busy?: boolean
  onSelectProduct: (product: ProductSearchHit) => void
  onSubmitBarcode: (code: string) => void
}

function StockBadge({ stock }: { stock: number }) {
  if (isOut(stock)) return <Badge variant="destructive">Out</Badge>
  if (isLow(stock)) return <Badge variant="destructive">{stock}</Badge>
  return <Badge variant="secondary">{stock}</Badge>
}

const INPUT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pl-9 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30"

export function ProductSearch({
  placeholder = "Scan or type a barcode, then press Enter",
  submitLabel = "Add",
  busy = false,
  onSelectProduct,
  onSubmitBarcode,
}: ProductSearchProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<ProductSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [activeValue, setActiveValue] = useState("")

  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  function reset() {
    setQuery("")
    setOpen(false)
    setResults([])
    setActiveValue("")
    inputRef.current?.focus()
  }

  function handleQueryChange(next: string) {
    setQuery(next)
    // Clear the dropdown immediately when the query drops below the min length,
    // so we never show stale results (setState in an event handler is fine).
    if (next.trim().length < 2) {
      setResults([])
      setOpen(false)
      setActiveValue("")
    }
  }

  const runSearch = useCallback(async (q: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}`, {
        signal: ctrl.signal,
        cache: "no-store",
      })
      const data = (await res.json()) as SearchResponse
      if (ctrl.signal.aborted) return
      if (res.ok && data.status === "ok" && Array.isArray(data.items)) {
        setResults(data.items)
        setOpen(true)
      } else {
        setResults([])
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setResults([])
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [])

  // Debounced server search: only after >= 2 chars. The q<2 clearing happens in
  // handleQueryChange, so this effect never calls setState synchronously.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const handle = setTimeout(() => {
      void runSearch(q)
    }, 200)
    return () => clearTimeout(handle)
  }, [query, runSearch])

  // Close on outside click.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  function hasActiveSelection(): boolean {
    return (
      open &&
      activeValue !== "" &&
      results.some((p) => String(p.id) === activeValue)
    )
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      // If a row is highlighted, let cmdk fire its onSelect; otherwise submit
      // the typed text as a raw barcode.
      if (hasActiveSelection()) return
      e.preventDefault()
      const code = query.trim()
      if (code) {
        onSubmitBarcode(code)
        reset()
      }
    } else if (e.key === "Escape") {
      setOpen(false)
      setActiveValue("")
    }
  }

  function select(product: ProductSearchHit) {
    onSelectProduct(product)
    reset()
  }

  function submitRaw() {
    const code = query.trim()
    if (!code) return
    onSubmitBarcode(code)
    reset()
  }

  return (
    <div className="flex gap-2">
      {/* One Command root must wrap BOTH the Input and the List: cmdk's Input
          reads the store from context, and crashes ("subscribe of undefined")
          if there's no Command ancestor. Raw CommandPrimitive is a transparent
          context provider here (the owned <Command> adds popover box-styling
          we don't want around the input). */}
      <CommandPrimitive
        ref={wrapperRef}
        shouldFilter={false}
        onValueChange={setActiveValue}
        className="relative flex-1"
      >
        <ScanLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <CommandPrimitive.Input
          ref={inputRef}
          value={query}
          onValueChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={INPUT_CLASS}
          autoFocus
          disabled={busy}
          inputMode="numeric"
        />
        {open ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md">
            <CommandList>
              {loading ? (
                <CommandEmpty>Searching…</CommandEmpty>
              ) : results.length === 0 ? (
                <CommandEmpty>
                  No matches — press Esc then Enter to use “{query.trim()}” as a barcode.
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={String(p.id)}
                      onSelect={() => select(p)}
                    >
                      <div className="flex w-full min-w-0 items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {p.barcode}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="tabular-nums text-sm">
                            {formatTHB(p.price)}
                          </span>
                          <StockBadge stock={p.stock} />
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </div>
        ) : null}
      </CommandPrimitive>
      <Button type="button" onClick={submitRaw} disabled={busy || query.trim() === ""}>
        <Search />
        {busy ? "Searching…" : submitLabel}
      </Button>
    </div>
  )
}
