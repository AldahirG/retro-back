import { Hono } from 'hono'
import { eq, desc, asc, count, sum, gte, and, or, ilike, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { orders, products, productImages, productVariants, discounts, drops, categories, settings } from '../db/schema.ts'
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
      .where(sql`stock - reserved_stock <= 3`),
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
  if (!body.slug?.trim()) return c.json({ error: 'Slug requerido' }, 400)
  if (!body.name?.trim()) return c.json({ error: 'Nombre requerido' }, 400)

  const [drop] = await db.insert(drops).values({
    slug:         body.slug.trim(),
    name:         body.name.trim(),
    subtitle:     body.subtitle || undefined,
    heroImageUrl: body.heroImageUrl || undefined,
    accentColor:  body.accentColor || '#e63946',
    endDate:      body.endDate   ? new Date(body.endDate)   : undefined,
    startDate:    body.startDate ? new Date(body.startDate) : undefined,
    active:       body.active !== false,
    order:        body.order ?? 0,
  }).returning()

  return c.json(drop, 201)
})

app.patch('/drops/:id', async (c) => {
  const body = await c.req.json()
  // Only set known columns — prevents schema-drift errors and unknown-key issues
  const patch: Record<string, any> = {}
  if (body.name      !== undefined) patch.name      = body.name
  if (body.slug      !== undefined) patch.slug      = body.slug
  if (body.subtitle  !== undefined) patch.subtitle  = body.subtitle || null
  if (body.heroImageUrl !== undefined) patch.heroImageUrl = body.heroImageUrl || null
  if (body.accentColor  !== undefined) patch.accentColor  = body.accentColor
  if (body.active    !== undefined) patch.active    = body.active
  if (body.order     !== undefined) patch.order     = body.order
  if (body.endDate   !== undefined) patch.endDate   = body.endDate ? new Date(body.endDate) : null
  if (body.startDate !== undefined) patch.startDate = body.startDate ? new Date(body.startDate) : null
  const [drop] = await db.update(drops).set(patch).where(eq(drops.id, c.req.param('id'))).returning()
  if (!drop) return c.json({ error: 'Drop no encontrado' }, 404)
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
  if (!body.code?.trim()) return c.json({ error: 'Código requerido' }, 400)
  if (!body.value && body.value !== 0) return c.json({ error: 'Valor requerido' }, 400)

  const [discount] = await db.insert(discounts).values({
    code:      body.code.trim().toUpperCase(),
    type:      body.type,
    value:     String(body.value),
    minOrder:  body.minOrder ? String(body.minOrder) : undefined,
    maxUses:   body.maxUses  ? Number(body.maxUses)  : undefined,
    validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
    validTo:   body.validTo   ? new Date(body.validTo)   : undefined,
    active:    body.active !== false,
  }).returning()
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

// ── PRODUCTS ADMIN ────────────────────────────────────────────
app.get('/products', async (c) => {
  const { search, category, page = '1', limit = '20' } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(limit)
  let catId: string | undefined
  if (category) {
    const cat = await db.query.categories.findFirst({ where: eq(categories.slug, category) })
    catId = cat?.id
  }
  const whereClause = and(
    catId  ? eq(products.categoryId, catId) : undefined,
    search ? or(ilike(products.name, `%${search}%`), ilike(products.slug, `%${search}%`)) : undefined,
  )
  const [rows, countRows] = await Promise.all([
    db.query.products.findMany({
      where: whereClause,
      with: { images: { orderBy: asc(productImages.position) }, variants: true, category: true, drop: true },
      orderBy: desc(products.createdAt),
      limit: parseInt(limit),
      offset,
    }),
    db.select({ count: count() }).from(products).where(whereClause),
  ])
  return c.json({ data: rows, page: parseInt(page), total: countRows[0].count })
})

app.get('/products/:id', async (c) => {
  const row = await db.query.products.findFirst({
    where: eq(products.id, c.req.param('id')),
    with: { images: true, variants: true, category: true, drop: true },
  })
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

// ── STOCK / VARIANTS ──────────────────────────────────────────
app.get('/variants', async (c) => {
  const { search } = c.req.query()
  const rows = await db.query.productVariants.findMany({
    with: { product: true },
    orderBy: productVariants.stock,
  })
  if (search) {
    const q = search.toLowerCase()
    return c.json(rows.filter(v => v.product?.name?.toLowerCase().includes(q) || v.size?.toLowerCase().includes(q) || v.color?.toLowerCase().includes(q)))
  }
  return c.json(rows)
})

app.patch('/variants/:id/stock', async (c) => {
  const { stock } = await c.req.json()
  if (typeof stock !== 'number' || stock < 0) return c.json({ error: 'Stock inválido' }, 400)
  const [v] = await db.update(productVariants)
    .set({ stock })
    .where(eq(productVariants.id, c.req.param('id')))
    .returning()
  if (!v) return c.json({ error: 'Variante no encontrada' }, 404)
  return c.json(v)
})

// ── REPORTS ───────────────────────────────────────────────────
app.get('/reports/sales', async (c) => {
  const { from, to } = c.req.query()
  const rows = await db.select({
    date:    sql<string>`DATE(created_at)`,
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
  .groupBy(sql`DATE(created_at)`)
  .orderBy(sql`DATE(created_at)`)

  return c.json(rows)
})

app.get('/reports/inventory', async (c) => {
  const rows = await db.query.productVariants.findMany({
    where: sql`stock - reserved_stock <= 5`,
    with: { product: { with: { images: true } } },
    orderBy: productVariants.stock,
  })
  return c.json(rows)
})

export default app
