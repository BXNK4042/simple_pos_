import { NextResponse, type NextRequest } from "next/server"
import { decrypt, SESSION_COOKIE } from "@/lib/session"

// Optimistic, cookie-only checks. Authoritative checks live in each page,
// route handler, and Server Action (a matcher can silently skip action POSTs).
const ADMIN_PREFIXES = [
  "/dashboard",
  "/products",
  "/stock-in",
  "/transactions",
  "/settings",
  "/users",
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = await decrypt(token)

  // Not authenticated -> /login.
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  // Cashiers may only reach /cashier and the /payment flow it drives.
  if (session.role === "cashier") {
    if (pathname === "/" || ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/cashier", req.nextUrl))
    }
  }

  return NextResponse.next()
}

export const config = {
  // Run on everything except API routes, static/asset paths, files with an
  // extension (images, fonts, etc.), and /login. Public/ assets like
  // /Waving_Cat_1.png must bypass the proxy or the image optimizer receives
  // an auth-redirect instead of the file bytes.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login|.*\\..*).*)",
  ],
}
