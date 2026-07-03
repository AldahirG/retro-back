import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, ilike, desc, asc } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { products, productImages, productVariants, categories, drops } from '../db/schema.ts'
import { requireAdmin } from '../middleware/auth.ts'
import { uploadImage, deleteImage } from '../lib/cloudinary.ts'

const app = new Hono()

const createProductSchema = z.object({
  slug:        z.string().min(1),
  name:        z.string().min(1),
  description: z.string().optional(),
  price:       z.string().regex(/^\d+(\.\d{1,2})?$/),
  categoryId:  z.string().uuid().optional(),
  dropId:      z.string().uuid().optional(),
  limited:     z.boolean().default(false),
  bestseller:  z.boolean().default(false),
  visible:     z.boolean().default(true),
})

// GET /products — lista pública con filtros
app.get('/', async (c) => {
  const { category, drop, search, sort = 'newest', page = '1', limit = '20' } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(limit)

  const rows = await db.query.products.findMany({
    where: and(
      eq(products.visible, true),
      category ? eq(products.categoryId,
        db.select({ id: categories.id }).from(categories).where(eq(categories.slug, category)).limit(1) as any
      ) : undefined,
    ),
    with: {
      images:   { orderBy: asc(productImages.position) },
      variants: true,
      category: true,
      drop:     true,
    },
    orderBy: sort === 'price_asc'  ? asc(products.price)
            : sort === 'price_desc' ? desc(products.price)
            : desc(products.createdAt),
    limit:  parseInt(limit),
    offset,
  })

  return c.json({ data: rows, page: parseInt(page) })
})

// GET /products/:slug
app.get('/:slug', async (c) => {
  const row = await db.query.products.findFirst({
    where: and(eq(products.slug, c.req.param('slug')), eq(products.visible, true)),
    with: { images: { orderBy: asc(productImages.position) }, variants: true, category: true, drop: true },
  })
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

// ── ADMIN ──────────────────────────────────────────────────────

// POST /products — crear
app.post('/', requireAdmin, zValidator('json', createProductSchema), async (c) => {
  const body = c.req.valid('json')
  const [product] = await db.insert(products).values(body).returning()
  return c.json(product, 201)
})

// PATCH /products/:id
app.patch('/:id', requireAdmin, async (c) => {
  const body = await c.req.json()
  const [updated] = await db.update(products)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(products.id, c.req.param('id')))
    .returning()
  if (!updated) return c.json({ error: 'Not found' }, 404)
  return c.json(updated)
})

// DELETE /products/:id
app.delete('/:id', requireAdmin, async (c) => {
  await db.delete(products).where(eq(products.id, c.req.param('id')))
  return c.json({ ok: true })
})

// POST /products/:id/images — subir imagen
app.post('/:id/images', requireAdmin, async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  if (!file) return c.json({ error: 'No file' }, 400)

  const buffer = Buffer.from(await file.arrayBuffer())
  const { url, publicId } = await uploadImage(buffer, 'products')

  const isPrimary = (formData.get('isPrimary') ?? 'false') === 'true'
  const position  = parseInt(formData.get('position') as string ?? '0')

  const [image] = await db.insert(productImages).values({
    productId: c.req.param('id'), url, publicId, isPrimary, position,
    alt: formData.get('alt') as string ?? '',
  }).returning()

  return c.json(image, 201)
})

// DELETE /products/:id/images/:imageId
app.delete('/:id/images/:imageId', requireAdmin, async (c) => {
  const [image] = await db.delete(productImages)
    .where(eq(productImages.id, c.req.param('imageId')))
    .returning()
  if (image?.publicId) await deleteImage(image.publicId)
  return c.json({ ok: true })
})

// POST /products/:id/variants
app.post('/:id/variants', requireAdmin, async (c) => {
  const body = await c.req.json()
  const [variant] = await db.insert(productVariants).values({
    productId: c.req.param('id'), ...body,
  }).returning()
  return c.json(variant, 201)
})

// PATCH /products/:id/variants/:variantId/stock
app.patch('/:id/variants/:variantId/stock', requireAdmin, async (c) => {
  const { stock } = await c.req.json()
  const [variant] = await db.update(productVariants)
    .set({ stock })
    .where(eq(productVariants.id, c.req.param('variantId')))
    .returning()
  return c.json(variant)
})

export default app
