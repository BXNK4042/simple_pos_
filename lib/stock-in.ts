"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"

export type StockInItem = {
  id: number
  barcode: string
  name: string
  price: number
  currentStock: number
  quantity: number
}

const STORAGE_KEY = "pos:stock-in"

type Action =
  | { type: "add"; item: StockInItem }
  | { type: "inc"; id: number }
  | { type: "dec"; id: number }
  | { type: "setQty"; id: number; quantity: number }
  | { type: "remove"; id: number }
  | { type: "clear" }
  | { type: "set"; items: StockInItem[] }

function clampQty(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

function reducer(state: StockInItem[], action: Action): StockInItem[] {
  switch (action.type) {
    case "add": {
      const existing = state.find((i) => i.id === action.item.id)
      if (existing) {
        return state.map((i) =>
          i.id === action.item.id ? { ...i, quantity: i.quantity + action.item.quantity } : i
        )
      }
      return [...state, action.item]
    }
    case "inc":
      return state.map((i) => (i.id === action.id ? { ...i, quantity: i.quantity + 1 } : i))
    case "dec":
      return state
        .map((i) => (i.id === action.id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    case "setQty":
      return state.map((i) =>
        i.id === action.id ? { ...i, quantity: clampQty(action.quantity) } : i
      )
    case "remove":
      return state.filter((i) => i.id !== action.id)
    case "clear":
      return []
    case "set":
      return action.items
    default:
      return state
  }
}

function readStorage(): StockInItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as StockInItem[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * useStockIn — client-side restock draft, persisted to localStorage under
 * "pos:stock-in" so a long receiving session survives a refresh. Mirrors the
 * shape of lib/cart.ts. The list is a *draft*; nothing hits the DB until the
 * user clicks "Apply stock-in".
 */
export function useStockIn() {
  const [items, dispatch] = useReducer(reducer, [])
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!loadedRef.current) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore quota / availability errors
    }
  }, [items])

  useEffect(() => {
    loadedRef.current = true
    dispatch({ type: "set", items: readStorage() })
    return () => {
      loadedRef.current = false
    }
  }, [])

  const add = useCallback((item: StockInItem) => dispatch({ type: "add", item }), [])
  const inc = useCallback((id: number) => dispatch({ type: "inc", id }), [])
  const dec = useCallback((id: number) => dispatch({ type: "dec", id }), [])
  const setQty = useCallback(
    (id: number, quantity: number) => dispatch({ type: "setQty", id, quantity }),
    []
  )
  const remove = useCallback((id: number) => dispatch({ type: "remove", id }), [])
  const clear = useCallback(() => dispatch({ type: "clear" }), [])

  const count = items.reduce((n, i) => n + i.quantity, 0)
  const distinct = items.length

  return { items, add, inc, dec, setQty, remove, clear, count, distinct }
}
