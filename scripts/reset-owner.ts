/**
 * Emergency owner password reset (the no-email "forgot password" path).
 *
 * Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, then run:
 *   npm run db:reset-owner
 */
import "dotenv/config"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.")
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user with email ${email}. Run \`npm run db:seed\` first.`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
  console.log(`Reset password for ${user.name} <${email}> (role: ${user.role}).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
