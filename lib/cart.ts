"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"
import type { ScanResult } from "@/lib/scan-events"

export type CartItem = {
  id: number
  barcode: string
  name: string
  price: number
  stock: number
  quantity: number
}

export type AddStatus = "added" | "incremented" | "capped"

const STORAGE_KEY = "pos:cart"

type Action =
  | { type: "add"; item: CartItem }
  | { type: "inc"; id: number }
  | { type: "dec"; id: number }
  | { type: "remove"; id: number }
  | { type: "clear" }
  | { type: "set"; items: CartItem[] }

function reducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case "add":
      return [...state, action.item]
    case "inc":
      return state.map((i) => (i.id === action.id ? { ...i, quantity: i.quantity + 1 } : i))
    case "dec":
      return state
        .map((i) => (i.id === action.id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
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

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function toCartItem(scan: ScanResult): CartItem {
  return {
    id: scan.id,
    barcode: scan.barcode,
    name: scan.product,
    price: scan.price,
    stock: scan.stock,
    quantity: 1,
  }
}

export function useCart() {
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

  const addItem = useCallback(
    (scan: ScanResult): AddStatus => {
      const existing = items.find((i) => i.id === scan.id)
      if (existing) {
        if (scan.stock > 0 && existing.quantity >= scan.stock) return "capped"
        dispatch({ type: "inc", id: scan.id })
        return "incremented"
      }
      dispatch({ type: "add", item: toCartItem(scan) })
      return "added"
    },
    [items]
  )

  const inc = useCallback((id: number) => dispatch({ type: "inc", id }), [])
  const dec = useCallback((id: number) => dispatch({ type: "dec", id }), [])
  const remove = useCallback((id: number) => dispatch({ type: "remove", id }), [])
  const clear = useCallback(() => dispatch({ type: "clear" }), [])

  const count = items.reduce((n, i) => n + i.quantity, 0)
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return { items, addItem, inc, dec, remove, clear, count, total }
}
