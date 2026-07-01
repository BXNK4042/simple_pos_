import "dotenv/config"
import { prisma } from "@/lib/prisma"
import type { Product } from "@/generated/prisma/client"

type ProductSeed = {
  barcode: string
  name: string
  price: number
  stock: number
}

const products: ProductSeed[] = [
  { barcode: "8851003202017", name: "MAMA Instant Noodles (Pork)", price: 20, stock: 40 },
  { barcode: "8851003205029", name: "MAMA Instant Noodles (Shrimp)", price: 20, stock: 35 },
  { barcode: "8851914006018", name: "Singha Drinking Water 600ml", price: 10, stock: 100 },
  { barcode: "8851003106019", name: "Chang Classic Beer 490ml", price: 45, stock: 24 },
  { barcode: "8850032200010", name: "Lay's Classic Potato Chips", price: 35, stock: 18 },
  { barcode: "8851003206015", name: "Milo 3-in-1 Sachet", price: 15, stock: 60 },
  { barcode: "8850285002012", name: "Red Bull (Krating Daeng) 150ml", price: 12, stock: 80 },
  { barcode: "8851003301010", name: "NESCAFE 3-in-1", price: 55, stock: 30 },
  { barcode: "8852595001015", name: "Singha Energy Drink", price: 25, stock: 5 },
  { barcode: "8851003402018", name: "Thai Tea Mix 350g", price: 65, stock: 22 },
  { barcode: "8850033105019", name: "Tao Kae Noi Seaweed", price: 40, stock: 3 },
  { barcode: "8851003506012", name: "Bear Brand Sterilized Milk", price: 18, stock: 50 },
]

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

type TxnSeed = {
  id: string
  ageMs: number
  items: { barcode: string; qty: number }[]
}

const transactions: TxnSeed[] = [
  { id: "001", ageMs: 2 * HOUR, items: [{ barcode: "8851003202017", qty: 2 }, { barcode: "8851914006018", qty: 1 }] },
  { id: "002", ageMs: 5 * HOUR, items: [{ barcode: "8850285002012", qty: 3 }, { barcode: "8850032200010", qty: 1 }] },
  { id: "003", ageMs: 1 * DAY + 3 * HOUR, items: [{ barcode: "8851003106019", qty: 2 }, { barcode: "8850033105019", qty: 1 }] },
  { id: "004", ageMs: 1 * DAY + 7 * HOUR, items: [{ barcode: "8851003301010", qty: 1 }, { barcode: "8851003506012", qty: 2 }] },
  { id: "005", ageMs: 2 * DAY + 4 * HOUR, items: [{ barcode: "8851003206015", qty: 4 }] },
  { id: "006", ageMs: 2 * DAY + 9 * HOUR, items: [{ barcode: "8851003402018", qty: 1 }, { barcode: "8851003205029", qty: 2 }] },
]

const seedTag = (id: string) => `seed-mock-${id}`

async function main() {
  for (const p of products) {
    await prisma.product.upsert({
      where: { barcode: p.barcode },
      update: { name: p.name, price: p.price, stock: p.stock },
      create: p,
    })
  }

  const all = await prisma.product.findMany()
  const byBarcode = new Map<string, Product>(all.map((p: Product) => [p.barcode, p]))

  const existing = await prisma.transaction.findMany({
    where: { stripePaymentId: { in: transactions.map((t) => seedTag(t.id)) } },
    select: { stripePaymentId: true },
  })
  const present = new Set(existing.map((e: { stripePaymentId: string | null }) => e.stripePaymentId))

  let createdTxns = 0
  for (const t of transactions) {
    const tag = seedTag(t.id)
    if (present.has(tag)) continue

    const items = t.items
      .map((it) => {
        const product = byBarcode.get(it.barcode)
        if (!product) throw new Error(`Seed references unknown barcode ${it.barcode}`)
        return { productId: product.id, quantity: it.qty, subtotal: product.price * it.qty }
      })
    const total = items.reduce((sum, i) => sum + i.subtotal, 0)

    await prisma.transaction.create({
      data: {
        total,
        status: "paid",
        stripePaymentId: tag,
        createdAt: new Date(Date.now() - t.ageMs),
        items: { create: items },
      },
    })
    createdTxns++
  }

  console.log(`Seeded ${products.length} products (upserted). Created ${createdTxns} new mock transactions (${transactions.length - createdTxns} already present).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
