export type ScanResult =
  | {
      status: "ok"
      id: number
      barcode: string
      product: string
      price: number
      stock: number
      currency: string
    }
  | {
      status: "unknown"
      id: number
      barcode: string
      currency: string
    }

/** A known product that can be added to the cart. */
export type ResolvedScan = Extract<ScanResult, { status: "ok" }>

type Listener = (scan: ScanResult) => void

const GLOBAL_KEY = "__pos_scan_emitter__"

type Emitter = { listeners: Set<Listener> }

function getEmitter(): Emitter {
  const g = globalThis as unknown as Record<string, Emitter | undefined>
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = { listeners: new Set<Listener>() }
  return g[GLOBAL_KEY]!
}

export function subscribeScan(listener: Listener): () => void {
  const { listeners } = getEmitter()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitScan(scan: ScanResult): void {
  for (const listener of getEmitter().listeners) listener(scan)
}
