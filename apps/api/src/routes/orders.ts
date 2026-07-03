import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../db/index.ts'
import {
  orders, orderItems, orderStatusHistory,
  productVariants, discounts, shipments
} from '../db/schema.ts'
import { requireAdmin, requireAuth } from '../middleware/auth.ts'

const app = new Hono()

const orderItemSchema = z.object({
  productId:   z.string().uuid(),
  variantId:   z.string().uuid(),
  productName: z.string(),
  size:        z.string(),
  color:       z.string().optional(),
  qty:         z.number().int().min(1),
  unitPrice:   z.string(),
})

const createOrderSchema = z.object({
  // Cliente registrado o guest
  guestName:  z.string().optional(),
  guestPhone: z.string().optional(),
  guestEmail: z.string().email().optional(),
  // Dirección
  shippingAddress: z.object({
    name:       z.string().optional(),
    street:     z.string(),
    city:       z.string(),
    state:      z.string(),
    zip:        z.string(),
    references: z.string().optional(),
  }).optional(),
  items:        z.array(orderItemSchema).min(1),
  discountCode: z.string().optional(),
  channel:      z.enum(['whatsapp', 'web', 'manual']).default('web'),
  notes:        z.string().optional(),
})

function generateOrderNumber() {
  const year = new Date().getFullYear()
  const id   = nanoid(6).toUpperCase()
  return `RR-${year}-${id}`
}

// POST /orders — crear pedido (guest o autenticado)
app.post('/', async (c) => {
  const body = createOrderSchema.parse(await c.req.json())

  // Resolver cupón
  let discountRow: typeof discounts.$inferSelect | undefined
  let discountAmount = 0
  if (body.discountCode) {
    discountRow = await db.query.discounts.findFirst({
      where: eq(discounts.code, body.discountCode),
    })
    if (!discountRow || !discountRow.active) {
      return c.json({ error: 'Cupón inválido o expirado' }, 400)
    }
    if (discountRow.maxUses && discountRow.usedCount >= discountRow.maxUses) {
      return c.json({ error: 'Cupón agotado' }, 400)
    }
  }

  // Calcular subtotal y validar stock
  let subtotal = 0
  for (const item of body.items) {
    const variant = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, item.variantId),
    })
    const available = (variant?.stock ?? 0) - (variant?.reservedStock ?? 0)
    if (available < item.qty) {
      return c.json({ error: `Stock insuficiente para talla ${item.size}` }, 409)
    }
    subtotal += parseFloat(item.unitPrice) * item.qty
  }

  // Calcular descuento
  if (discountRow) {
    if (discountRow.type === 'percent') {
      discountAmount = subtotal * (parseFloat(discountRow.value) / 100)
    } else if (discountRow.type === 'fixed') {
      discountAmount = parseFloat(discountRow.value)
    }
    // free_shipping se aplica en shippingCost
  }

  const total = subtotal - discountAmount

  // Obtener user_id si viene autenticado
  let userId: string | undefined
  try {
    const { auth } = await import('../lib/auth.ts')
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (session) userId = session.user.id
  } catch {}

  const orderNumber = generateOrderNumber()

  const [order] = await db.insert(orders).values({
    orderNumber,
    userId,
    guestName:           body.guestName,
    guestPhone:          body.guestPhone,
    guestEmail:          body.guestEmail,
    subtotal:            subtotal.toFixed(2),
    discountAmount:      discountAmount.toFixed(2),
    shippingCost:        '0.00',
    total:               total.toFixed(2),
    discountId:          discountRow?.id,
    shippingAddressJson: body.shippingAddress,
    channel:             body.channel,
    notes:               body.notes,
  }).returning()

  // Items
  await db.insert(orderItems).values(
    body.items.map(item => ({ orderId: order.id, ...item }))
  )

  // Historial inicial
  await db.insert(orderStatusHistory).values({
    orderId: order.id, status: 'pending', note: 'Pedido creado',
  })

  // Reservar stock
  for (const item of body.items) {
    await db.update(productVariants)
      .set({ reservedStock: db.sql`reserved_stock + ${item.qty}` as any })
      .where(eq(productVariants.id, item.variantId))
  }

  // Incrementar uso de cupón
  if (discountRow) {
    await db.update(discounts)
      .set({ usedCount: discountRow.usedCount + 1 })
      .where(eq(discounts.id, discountRow.id))
  }

  return c.json({ order, orderNumber }, 201)
})

// GET /orders/:orderNumber — tracking público (verifica phone)
app.get('/track/:orderNumber', async (c) => {
  const { phone } = c.req.query()
  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, c.req.param('orderNumber')),
    with: { items: true, shipment: true },
  })
  if (!order) return c.json({ error: 'Pedido no encontrado' }, 404)
  // Verificar que el phone coincida (guest o user)
  if (order.guestPhone !== phone) return c.json({ error: 'No autorizado' }, 403)
  return c.json(order)
})

// ── CLIENTE AUTENTICADO ───────────────────────────────────────
app.get('/me', requireAuth, async (c) => {
  const user = c.get('user') as any
  const myOrders = await db.query.orders.findMany({
    where: eq(orders.userId, user.id),
    orderBy: desc(orders.createdAt),
    with: { items: true },
  })
  return c.json(myOrders)
})

// ── ADMIN ──────────────────────────────────────────────────────
app.get('/', requireAdmin, async (c) => {
  const { status, page = '1', limit = '30' } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(limit)

  const rows = await db.query.orders.findMany({
    where: status ? eq(orders.status, status as any) : undefined,
    orderBy: desc(orders.createdAt),
    with: { items: true, shipment: true },
    limit: parseInt(limit),
    offset,
  })
  return c.json({ data: rows, page: parseInt(page) })
})

app.get('/:id', requireAdmin, async (c) => {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, c.req.param('id')),
    with: { items: true, statusHistory: true, shipment: true, payment: true },
  })
  if (!order) return c.json({ error: 'Not found' }, 404)
  return c.json(order)
})

// PATCH /orders/:id/status — cambiar estado
app.patch('/:id/status', requireAdmin, async (c) => {
  const { status, note } = await c.req.json()
  const user = c.get('user') as any

  const [updated] = await db.update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, c.req.param('id')))
    .returning()

  await db.insert(orderStatusHistory).values({
    orderId: c.req.param('id'), status, note, createdBy: user.id,
  })

  // Si se cancela, liberar stock reservado
  if (status === 'cancelled') {
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, c.req.param('id')),
    })
    for (const item of items) {
      if (item.variantId) {
        await db.update(productVariants)
          .set({ reservedStock: db.sql`GREATEST(reserved_stock - ${item.qty}, 0)` as any })
          .where(eq(productVariants.id, item.variantId))
      }
    }
  }

  // Si se entrega, descontar stock real
  if (status === 'delivered') {
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, c.req.param('id')),
    })
    for (const item of items) {
      if (item.variantId) {
        await db.update(productVariants)
          .set({
            stock:         db.sql`GREATEST(stock - ${item.qty}, 0)` as any,
            reservedStock: db.sql`GREATEST(reserved_stock - ${item.qty}, 0)` as any,
          })
          .where(eq(productVariants.id, item.variantId))
      }
    }
  }

  return c.json(updated)
})

// POST /orders/:id/shipment — registrar envío
app.post('/:id/shipment', requireAdmin, async (c) => {
  const body = await c.req.json()
  const [shipment] = await db.insert(shipments).values({
    orderId: c.req.param('id'), ...body, shippedAt: new Date(),
  }).returning()

  await db.update(orders)
    .set({ status: 'shipped', updatedAt: new Date() })
    .where(eq(orders.id, c.req.param('id')))

  return c.json(shipment)
})

export default app
