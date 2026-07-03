import 'dotenv/config'
import { db } from './index.ts'
import { users } from './schema.ts'
import { eq } from 'drizzle-orm'
import { auth } from '../lib/auth.ts'

const EMAIL    = process.argv[2] ?? 'admin@retroreeves.com'
const PASSWORD = process.argv[3] ?? 'admin1234'
const NAME     = process.argv[4] ?? 'Admin'

async function main() {
  // Check existing
  const existing = await db.query.users.findFirst({ where: eq(users.email, EMAIL) })
  if (existing) {
    // Just update role to admin
    await db.update(users).set({ role: 'admin' }).where(eq(users.email, EMAIL))
    console.log(`✅ User ${EMAIL} updated to role=admin`)
    process.exit(0)
  }

  // Create via Better Auth API
  const res = await auth.api.signUpEmail({
    body: { email: EMAIL, password: PASSWORD, name: NAME },
  })
  if (!res?.user?.id) {
    console.error('❌ Failed to create user:', res)
    process.exit(1)
  }

  // Set role to admin
  await db.update(users).set({ role: 'admin' }).where(eq(users.id, res.user.id))
  console.log(`✅ Admin created: ${EMAIL} / ${PASSWORD}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
