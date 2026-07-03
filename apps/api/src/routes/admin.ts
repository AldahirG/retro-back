import { Hono } from 'hono'
import { eq, desc, count, sum, gte, and } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { orders, products, productVariants, discounts, drops, categories, settings } from '../db/schema.ts'
import { requireAdmin } from '../middleware/auth.ts'


const app = new Hono()
app.use('*', requireAdmin)

// GET /admin/dashboard
app.get('/dashboard', async (c) => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0)

  const [
    ordersToday, ordersMonth, ordersTotal, revenueMonth,
    pendingOrders, lowStockVariants, productsCount,
  ] = await Promise.all([
    db.select({ count: count() }).from(orders).where(gte(orders.createdAt, today)),
    db.select({ count: count() }).from(orders).where(gte(orders.createdAt, month)),
    db.select({ count: count() }).from(orders),
    db.select({ total: sum(orders.total) }).from(orders)
      .where(and(gte(orders.createdAt, month), eq(orders.status, 'delivered'))),
    db.select({ count: count() }).from(orders).where(eq(orders.status, 'pending')),
    db.select({ count: count() }).from(productVariants)
      .where(db.sql`stock - reserved_stock <= 3` as any),
    db.select({ count: count() }).from(products).where(eq(products.visible, true)),
  ])

  const recentOrders = await db.query.orders.findMany({
    orderBy: desc(orders.createdAt),
    limit: 10,
    with: { items: true },
  })

  return c.json({
    ordersToday:      ordersToday[0].count,
    ordersMonth:      ordersMonth[0].count,
    ordersTotal:      ordersTotal[0].count,
    revenueMonth:     revenueMonth[0].total ?? 0,
    salesMonth:       revenueMonth[0].total ?? 0,
    pendingOrders:    pendingOrders[0].count,
    lowStockVariants: lowStockVariants[0].count,
    products:         productsCount[0].count,
    recentOrders,
  })
})

// ── DROPS ─────────────────────────────────────────────────────
app.get('/drops', async (c) => {
  return c.json(await db.query.drops.findMany({ orderBy: [desc(drops.active), drops.order] }))
})

app.post('/drops', async (c) => {
  const body = await c.req.json()
  const [drop] = await db.insert(drops).values({
    slug:        body.slug,
    name:        body.name,
    subtitle:    body.subtitle ?? undefined,
    heroImageUrl: body.heroImageUrl ?? undefined,
    accentColor: body.accentColor ?? '#e63946',
    endDate:     body.endDate ? new Date(body.endDate) : undefined,
    active:      body.active !== false,
    order:       body.order ?? 0,
  }).returning()

  return c.json(drop, 201)
})

app.patch('/drops/:id', async (c) => {
  const body = await c.req.json()
  const [drop] = await db.update(drops).set(body).where(eq(drops.id, c.req.param('id'))).returning()
  return c.json(drop)
})

app.delete('/drops/:id', async (c) => {
  await db.delete(drops).where(eq(drops.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ── CATEGORIES ────────────────────────────────────────────────
app.get('/categories', async (c) => {
  return c.json(await db.query.categories.findMany({ orderBy: categories.order }))
})

app.post('/categories', async (c) => {
  const body = await c.req.json()
  const [cat] = await db.insert(categories).values(body).returning()
  return c.json(cat, 201)
})

app.patch('/categories/:id', async (c) => {
  const body = await c.req.json()
  const [cat] = await db.update(categories).set(body).where(eq(categories.id, c.req.param('id'))).returning()
  return c.json(cat)
})

app.delete('/categories/:id', async (c) => {
  await db.delete(categories).where(eq(categories.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ── DISCOUNTS ─────────────────────────────────────────────────
app.get('/discounts', async (c) => {
  return c.json(await db.query.discounts.findMany({ orderBy: desc(discounts.createdAt) }))
})

app.post('/discounts', async (c) => {
  const body = await c.req.json()
  const [discount] = await db.insert(discounts).values(body).returning()
  return c.json(discount, 201)
})

app.patch('/discounts/:id', async (c) => {
  const body = await c.req.json()
  const [discount] = await db.update(discounts).set(body).where(eq(discounts.id, c.req.param('id'))).returning()
  return c.json(discount)
})

app.delete('/discounts/:id', async (c) => {
  await db.delete(discounts).where(eq(discounts.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ── SETTINGS ──────────────────────────────────────────────────
app.get('/settings', async (c) => {
  const rows = await db.select().from(settings)
  return c.json(Object.fromEntries(rows.map(r => [r.key, r.value])))
})

app.put('/settings', async (c) => {
  const body: Record<string, string> = await c.req.json()
  for (const [key, value] of Object.entries(body)) {
    await db.insert(settings).values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  }
  return c.json({ ok: true })
})

// ── REPORTS ───────────────────────────────────────────────────
app.get('/reports/sales', async (c) => {
  const { from, to } = c.req.query()
  const rows = await db.select({
    date:    db.sql<string>`DATE(created_at)`,
    revenue: sum(orders.total),
    count:   count(),
  })
  .from(orders)
  .where(
    and(
      from ? gte(orders.createdAt, new Date(from)) : undefined,
      eq(orders.status, 'delivered'),
    )
  )
  .groupBy(db.sql`DATE(created_at)`)
  .orderBy(db.sql`DATE(created_at)`)

  return c.json(rows)
})

app.get('/reports/inventory', async (c) => {
  const rows = await db.query.productVariants.findMany({
    where: db.sql`stock - reserved_stock <= 5` as any,
    with: { product: { with: { images: true } } },
    orderBy: productVariants.stock,
  })
  return c.json(rows)
})

export default app
