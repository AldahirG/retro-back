import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { auth } from './lib/auth.ts'
import productsRouter  from './routes/products.ts'
import ordersRouter    from './routes/orders.ts'
import adminRouter     from './routes/admin.ts'
import discountsRouter from './routes/discounts.ts'
import paymentsRouter  from './routes/payments.ts'

const app = new Hono()

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use('*', logger())
app.use('*', cors({
  origin:      (process.env.CORS_ORIGINS ?? 'http://localhost:4321').split(','),
  credentials: true,
}))

// ── AUTH (Better Auth maneja sus propias rutas) ───────────────
app.all('/api/auth/*', c => auth.handler(c.req.raw))

// ── RUTAS PÚBLICAS ────────────────────────────────────────────
app.route('/api/v1/products',  productsRouter)
app.route('/api/v1/discounts', discountsRouter)

// Drops y categorías públicos
app.get('/api/v1/drops', async (c) => {
  const { db } = await import('./db/index.ts')
  const { drops } = await import('./db/schema.ts')
  const { eq, asc } = await import('drizzle-orm')
  const rows = await db.query.drops.findMany({
    where: eq(drops.active, true),
    orderBy: asc(drops.order),
  })
  return c.json(rows)
})

app.get('/api/v1/drops/:slug', async (c) => {
  const { db } = await import('./db/index.ts')
  const { drops } = await import('./db/schema.ts')
  const { eq } = await import('drizzle-orm')
  const drop = await db.query.drops.findFirst({ where: eq(drops.slug, c.req.param('slug')) })
  if (!drop) return c.json({ error: 'Not found' }, 404)
  return c.json(drop)
})

app.get('/api/v1/categories', async (c) => {
  const { db } = await import('./db/index.ts')
  const { categories } = await import('./db/schema.ts')
  const { eq, asc } = await import('drizzle-orm')
  const rows = await db.query.categories.findMany({
    where: eq(categories.visible, true),
    orderBy: asc(categories.order),
  })
  return c.json(rows)
})

// ── RUTAS CON AUTH ────────────────────────────────────────────
app.route('/api/v1/orders',   ordersRouter)
app.route('/api/v1/payments', paymentsRouter)

// ── PERFIL DE USUARIO ─────────────────────────────────────────
app.get('/api/v1/profile', async (c) => {
  const { db }            = await import('./db/index.ts')
  const { users, addresses } = await import('./db/schema.ts')
  const { eq }            = await import('drizzle-orm')
  const session = await (await import('./lib/auth.ts')).auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) return c.json({ error: 'No autenticado' }, 401)
  const [user] = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.id, session.user.id))
  const addrs  = await db.select().from(addresses).where(eq(addresses.userId, session.user.id))
  return c.json({ user, addresses: addrs })
})

app.patch('/api/v1/profile', async (c) => {
  const { db }   = await import('./db/index.ts')
  const { users } = await import('./db/schema.ts')
  const { eq }   = await import('drizzle-orm')
  const session  = await (await import('./lib/auth.ts')).auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) return c.json({ error: 'No autenticado' }, 401)
  const body = await c.req.json()
  const allowed = { name: body.name, phone: body.phone }
  const [updated] = await db.update(users).set(allowed).where(eq(users.id, session.user.id)).returning({ id: users.id, name: users.name, email: users.email, phone: users.phone })
  return c.json(updated)
})

app.post('/api/v1/profile/addresses', async (c) => {
  const { db }       = await import('./db/index.ts')
  const { addresses } = await import('./db/schema.ts')
  const { eq }       = await import('drizzle-orm')
  const session      = await (await import('./lib/auth.ts')).auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) return c.json({ error: 'No autenticado' }, 401)
  const body = await c.req.json()
  // Si es default, quitar default de las demás
  if (body.isDefault) await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, session.user.id))
  const [addr] = await db.insert(addresses).values({ ...body, userId: session.user.id }).returning()
  return c.json(addr, 201)
})

app.patch('/api/v1/profile/addresses/:id', async (c) => {
  const { db }       = await import('./db/index.ts')
  const { addresses } = await import('./db/schema.ts')
  const { eq, and }  = await import('drizzle-orm')
  const session      = await (await import('./lib/auth.ts')).auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) return c.json({ error: 'No autenticado' }, 401)
  const body = await c.req.json()
  if (body.isDefault) await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, session.user.id))
  const [addr] = await db.update(addresses).set(body).where(and(eq(addresses.id, c.req.param('id')), eq(addresses.userId, session.user.id))).returning()
  return c.json(addr)
})

app.delete('/api/v1/profile/addresses/:id', async (c) => {
  const { db }       = await import('./db/index.ts')
  const { addresses } = await import('./db/schema.ts')
  const { eq, and }  = await import('drizzle-orm')
  const session      = await (await import('./lib/auth.ts')).auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) return c.json({ error: 'No autenticado' }, 401)
  await db.delete(addresses).where(and(eq(addresses.id, c.req.param('id')), eq(addresses.userId, session.user.id)))
  return c.json({ ok: true })
})

// ── ADMIN ─────────────────────────────────────────────────────
app.route('/api/v1/admin', adminRouter)

// ── HEALTH ───────────────────────────────────────────────────
app.get('/health', c => c.json({ ok: true, ts: new Date().toISOString() }))

// ── STOCK CLEANUP — liberar reservas de pedidos abandonados ──
async function releaseAbandonedStock() {
  try {
    const { db }   = await import('./db/index.ts')
    const { orders, orderItems, orderStatusHistory, productVariants } = await import('./db/schema.ts')
    const { eq, and, lte, sql } = await import('drizzle-orm')

    // Pedidos 'pending' con más de 2 horas sin actualización = abandonados
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000)

    const stale = await db.query.orders.findMany({
      where: and(eq(orders.status, 'pending'), lte(orders.createdAt, cutoff)),
      with: { items: true },
    })

    if (!stale.length) return

    for (const order of stale) {
      await db.update(orders)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(orders.id, order.id))

      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status:  'cancelled',
        note:    'Cancelado automáticamente — sin confirmar en 2h',
      })

      for (const item of order.items) {
        if (item.variantId) {
          await db.update(productVariants)
            .set({ reservedStock: sql`GREATEST(reserved_stock - ${item.qty}, 0)` })
            .where(eq(productVariants.id, item.variantId))
        }
      }
    }

    console.log(`[cleanup] ${stale.length} pedido(s) abandonados cancelados`)
  } catch (e) {
    console.error('[cleanup] error:', e)
  }
}

// ── START ─────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? '3001')
serve({ fetch: app.fetch, port }, () => {
  console.log(`🚀 Retro Back corriendo en http://localhost:${port}`)
  releaseAbandonedStock()
  setInterval(releaseAbandonedStock, 60 * 60 * 1000)  // cada hora
})
