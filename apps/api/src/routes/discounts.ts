import { Hono } from 'hono'
import { eq, and, lte, gte } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { discounts } from '../db/schema.ts'

const app = new Hono()

// POST /discounts/validate — valida cupón antes del checkout
app.post('/validate', async (c) => {
  const { code, subtotal } = await c.req.json()

  const discount = await db.query.discounts.findFirst({
    where: eq(discounts.code, code.toUpperCase()),
  })

  if (!discount || !discount.active) {
    return c.json({ valid: false, error: 'Cupón no encontrado' }, 404)
  }

  const now = new Date()
  if (discount.validFrom && new Date(discount.validFrom) > now) {
    return c.json({ valid: false, error: 'Cupón aún no disponible' }, 400)
  }
  if (discount.validTo && new Date(discount.validTo) < now) {
    return c.json({ valid: false, error: 'Cupón expirado' }, 400)
  }
  if (discount.maxUses && discount.usedCount >= discount.maxUses) {
    return c.json({ valid: false, error: 'Cupón agotado' }, 400)
  }
  if (discount.minOrder && parseFloat(String(subtotal)) < parseFloat(String(discount.minOrder))) {
    return c.json({ valid: false, error: `Mínimo de compra: $${discount.minOrder} MXN` }, 400)
  }

  let savings = 0
  if (discount.type === 'percent') {
    savings = parseFloat(String(subtotal)) * (parseFloat(String(discount.value)) / 100)
  } else if (discount.type === 'fixed') {
    savings = parseFloat(String(discount.value))
  }

  return c.json({
    valid: true,
    discount: {
      id:   discount.id,
      code: discount.code,
      type: discount.type,
      value: discount.value,
    },
    savings: savings.toFixed(2),
  })
})

export default app
