import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScanLine, LayoutDashboard, Package, PackagePlus, ReceiptText, Settings, Users } from "lucide-react";
import { verifySession } from "@/lib/auth";

const links = [
  { href: "/cashier", label: "Cashier", desc: "Scan items & take payments", icon: ScanLine },
  { href: "/dashboard", label: "Dashboard", desc: "Sales & stock overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", desc: "Browse sales & receipts", icon: ReceiptText },
  { href: "/products", label: "Products", desc: "Manage the product catalog", icon: Package },
  { href: "/stock-in", label: "Stock-in", desc: "Add stock by scanning barcodes", icon: PackagePlus },
  { href: "/users", label: "Users", desc: "Create cashiers & reset passwords", icon: Users },
  { href: "/settings", label: "Settings", desc: "Your account", icon: Settings },
];

export default async function Home() {
  await verifySession();
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          POS System
        </h1>
        {/*<p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Choose where to go.
        </p>*/}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {links.map(({ href, label, desc, icon: Icon }) => (
            <Button
              key={href}
              asChild
              variant="outline"
              className="h-auto w-full flex-col items-start gap-2 whitespace-normal p-5 text-left"
            >
              <Link href={href}>
                <Icon className="size-5 text-zinc-700 dark:text-zinc-300" />
                <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {label}
                </span>
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  {desc}
                </span>
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </main>
  );
}
