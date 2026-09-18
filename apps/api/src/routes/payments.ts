import { Hono } from 'hono'
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { orders, orderItems, orderStatusHistory } from '../db/schema.ts'
import { sendOrderConfirmation } from '../lib/email.ts'

const app = new Hono()

function mpClient() {
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! })
}

const SITE    = process.env.PUBLIC_SITE_URL  ?? 'https://retroreeves.com'
const API_URL = process.env.PUBLIC_API_URL  ?? 'http://localhost:3000'

// POST /payments/create-preference
// Body: { orderId: string }
app.post('/create-preference', async (c) => {
  const { orderId } = await c.req.json()

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  })

  if (!order) return c.json({ error: 'Orden no encontrada' }, 404)
  if (order.status !== 'pending') return c.json({ error: 'Orden ya procesada' }, 400)

  const preference = new Preference(mpClient())

  const shippingCost = parseFloat(order.shippingCost ?? '0')
  const productItems = order.items.map(i => ({
    id:          i.variantId ?? i.productId,
    title:       `${i.productName} — ${i.size}${i.color ? ` / ${i.color}` : ''}`,
    quantity:    i.qty,
    unit_price:  parseFloat(i.unitPrice),
    currency_id: 'MXN',
  }))
  const shippingItem = shippingCost > 0 ? [{
    id:          'envio',
    title:       'Costo de envío',
    quantity:    1,
    unit_price:  shippingCost,
    currency_id: 'MXN',
  }] : []

  const result = await preference.create({
    body: {
      external_reference: order.orderNumber,
      items: [...productItems, ...shippingItem],
      payer: {
        name:  order.guestName  ?? undefined,
        email: order.guestEmail ?? undefined,
        phone: order.guestPhone ? { number: order.guestPhone } : undefined,
      },
      back_urls: {
        success: `${SITE}/pago/gracias?order=${order.orderNumber}`,
        failure: `${SITE}/pago/error?order=${order.orderNumber}`,
        pending: `${SITE}/pago/pendiente?order=${order.orderNumber}`,
      },
      // auto_return solo funciona con HTTPS (producción)
      ...(SITE.startsWith('https') ? { auto_return: 'approved' } : {}),
      notification_url:   `${API_URL}/api/v1/payments/webhook`,
      statement_descriptor: 'RETRO REEVES',
    },
  })

  return c.json({ preferenceId: result.id, initPoint: result.init_point })
})

// POST /payments/webhook — MercadoPago IPN/webhook
app.post('/webhook', async (c) => {
  // Validar firma HMAC si el secret está configurado
  const secret = process.env.MP_WEBHOOK_SECRET
  if (secret) {
    const xSignature = c.req.header('x-signature') ?? ''
    const xRequestId = c.req.header('x-request-id') ?? ''
    const dataId     = c.req.query('data.id') ?? c.req.query('id') ?? ''

    // MP firma: ts=<timestamp>,v1=<hash>
    const parts: Record<string, string> = {}
    xSignature.split(',').forEach(p => { const [k, v] = p.split('='); if (k && v) parts[k.trim()] = v.trim() })
    const ts   = parts['ts']  ?? ''
    const hash = parts['v1']  ?? ''
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`

    const { createHmac } = await import('crypto')
    const expected = createHmac('sha256', secret).update(manifest).digest('hex')
    if (expected !== hash) {
      console.warn('[mp webhook] firma inválida')
      return c.json({ ok: false }, 400)
    }
  }

  const body = await c.req.json().catch(() => ({}))
  const { type, data } = body as { type?: string; data?: { id?: string } }

  if (type !== 'payment' || !data?.id) return c.json({ ok: true })

  try {
    const payment = new Payment(mpClient())
    const mp = await payment.get({ id: String(data.id) })

    const orderNumber = mp.external_reference
    if (!orderNumber) return c.json({ ok: true })

    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
      with: { items: true },
    })
    if (!order) return c.json({ ok: true })

    const status = mp.status // approved | pending | rejected | cancelled

    // Map MP status → our status
    const statusMap: Record<string, string> = {
      approved: 'confirmed',
      pending:  'pending',
      rejected: 'pending',  // stays pending, customer can retry
    }
    const newStatus = statusMap[status ?? ''] ?? 'pending'

    if (newStatus === 'confirmed' && order.status === 'pending') {
      await db.update(orders)
        .set({ status: 'confirmed', updatedAt: new Date() })
        .where(eq(orders.id, order.id))

      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status:  'confirmed',
        note:    `Pago aprobado MP — payment_id: ${data.id}`,
      })

      // Email confirmación si aún no se envió (guest con email o usuario)
      const emailTo = order.guestEmail
      if (emailTo) {
        sendOrderConfirmation({
          to:          emailTo,
          orderNumber: order.orderNumber,
          items:       order.items.map(i => ({
            productName: i.productName,
            size:        i.size,
            color:       i.color,
            qty:         i.qty,
            unitPrice:   i.unitPrice,
          })),
          subtotal:    order.subtotal,
          discount:    order.discountAmount ?? '0.00',
          shipping:    order.shippingCost   ?? '0.00',
          total:       order.total,
          name:        order.guestName,
        }).catch(err => console.error('[email] webhook confirmation failed:', err))
      }
    }
  } catch (err) {
    console.error('[mp webhook]', err)
  }

  return c.json({ ok: true })
})

export default app
