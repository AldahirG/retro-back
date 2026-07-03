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
app.route('/api/v1/orders', ordersRouter)

// ── ADMIN ─────────────────────────────────────────────────────
app.route('/api/v1/admin', adminRouter)

// ── HEALTH ───────────────────────────────────────────────────
app.get('/health', c => c.json({ ok: true, ts: new Date().toISOString() }))

// ── START ─────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? '3001')
serve({ fetch: app.fetch, port }, () => {
  console.log(`🚀 Retro Back corriendo en http://localhost:${port}`)
})
