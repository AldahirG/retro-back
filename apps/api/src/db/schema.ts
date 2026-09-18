import {
  pgTable, pgEnum, text, integer, numeric, boolean,
  timestamp, jsonb, uuid, index, uniqueIndex
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── ENUMS ────────────────────────────────────────────────────
export const userRoleEnum    = pgEnum('user_role',    ['customer', 'admin'])
export const orderStatusEnum = pgEnum('order_status', [
  'pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded'
])
export const discountTypeEnum = pgEnum('discount_type', ['percent', 'fixed', 'free_shipping'])
export const channelEnum      = pgEnum('channel',       ['whatsapp', 'web', 'manual'])
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'refunded'])

// ── USUARIOS ──────────────────────────────────────────────────
export const users = pgTable('users', {
  id:            text('id').primaryKey(),                          // Better Auth genera su propio ID
  email:         text('email').unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  phone:         text('phone'),
  name:          text('name').notNull(),
  image:         text('image'),
  role:          userRoleEnum('role').default('customer').notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
  lastLogin:     timestamp('last_login'),
})

export const sessions = pgTable('sessions', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token:     text('token').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
})

export const accounts = pgTable('accounts', {
  id:                  text('id').primaryKey(),
  userId:              text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId:           text('account_id').notNull(),
  providerId:          text('provider_id').notNull(),
  accessToken:         text('access_token'),
  refreshToken:        text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope:               text('scope'),
  idToken:             text('id_token'),
  password:            text('password'),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
}, t => [uniqueIndex('accounts_provider_idx').on(t.providerId, t.accountId)])

export const verifications = pgTable('verifications', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
})

export const addresses = pgTable('addresses', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name:      text('name').notNull(),
  street:    text('street').notNull(),
  city:      text('city').notNull(),
  state:     text('state').notNull(),
  zip:       text('zip').notNull(),
  country:   text('country').default('MX').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
})

// ── CATÁLOGO ──────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id:          uuid('id').primaryKey().defaultRandom(),
  slug:        text('slug').unique().notNull(),
  name:        text('name').notNull(),
  description: text('description'),
  visible:     boolean('visible').default(true).notNull(),
  order:       integer('order').default(0).notNull(),
})

export const drops = pgTable('drops', {
  id:          uuid('id').primaryKey().defaultRandom(),
  slug:        text('slug').unique().notNull(),
  name:        text('name').notNull(),
  subtitle:    text('subtitle'),
  heroImageUrl: text('hero_image_url'),
  accentColor: text('accent_color').default('#e63946').notNull(),
  startDate:   timestamp('start_date'),
  endDate:     timestamp('end_date'),
  active:      boolean('active').default(true).notNull(),
  order:       integer('order').default(0).notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

export const products = pgTable('products', {
  id:          uuid('id').primaryKey().defaultRandom(),
  slug:        text('slug').unique().notNull(),
  name:        text('name').notNull(),
  description: text('description'),
  price:       numeric('price', { precision: 10, scale: 2 }).notNull(),
  categoryId:  uuid('category_id').references(() => categories.id),
  dropId:      uuid('drop_id').references(() => drops.id),
  limited:     boolean('limited').default(false).notNull(),
  bestseller:  boolean('bestseller').default(false).notNull(),
  visible:     boolean('visible').default(true).notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
}, t => [index('products_category_idx').on(t.categoryId)])

export const productImages = pgTable('product_images', {
  id:        uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  url:       text('url').notNull(),
  publicId:  text('public_id'),           // Cloudinary public_id para poder eliminar
  alt:       text('alt'),
  position:  integer('position').default(0).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
})

export const productVariants = pgTable('product_variants', {
  id:            uuid('id').primaryKey().defaultRandom(),
  productId:     uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  size:          text('size').notNull(),
  color:         text('color'),
  sku:           text('sku').unique(),
  stock:         integer('stock').default(0).notNull(),
  reservedStock: integer('reserved_stock').default(0).notNull(),  // reservado en checkout activo
}, t => [index('variants_product_idx').on(t.productId)])

// ── DESCUENTOS / OFERTAS ─────────────────────────────────────
export const discounts = pgTable('discounts', {
  id:         uuid('id').primaryKey().defaultRandom(),
  code:       text('code').unique().notNull(),
  type:       discountTypeEnum('type').notNull(),
  value:      numeric('value', { precision: 10, scale: 2 }).notNull(),
  minOrder:   numeric('min_order', { precision: 10, scale: 2 }),
  maxUses:    integer('max_uses'),
  usedCount:  integer('used_count').default(0).notNull(),
  validFrom:  timestamp('valid_from'),
  validTo:    timestamp('valid_to'),
  active:     boolean('active').default(true).notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
})

export const productDiscounts = pgTable('product_discounts', {
  id:         uuid('id').primaryKey().defaultRandom(),
  productId:  uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  discountId: uuid('discount_id').references(() => discounts.id, { onDelete: 'cascade' }).notNull(),
})

// ── PEDIDOS ───────────────────────────────────────────────────
export const orders = pgTable('orders', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  orderNumber:         text('order_number').unique().notNull(),
  userId:              text('user_id').references(() => users.id),
  guestName:           text('guest_name'),
  guestPhone:          text('guest_phone'),
  guestEmail:          text('guest_email'),
  status:              orderStatusEnum('status').default('pending').notNull(),
  subtotal:            numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  discountAmount:      numeric('discount_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  shippingCost:        numeric('shipping_cost', { precision: 10, scale: 2 }).default('0').notNull(),
  total:               numeric('total', { precision: 10, scale: 2 }).notNull(),
  discountId:          uuid('discount_id').references(() => discounts.id),
  shippingAddressJson: jsonb('shipping_address_json'),   // snapshot dirección al momento del pedido
  channel:             channelEnum('channel').default('whatsapp').notNull(),
  notes:               text('notes'),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
}, t => [index('orders_status_idx').on(t.status), index('orders_user_idx').on(t.userId)])

export const orderItems = pgTable('order_items', {
  id:           uuid('id').primaryKey().defaultRandom(),
  orderId:      uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId:    uuid('product_id').references(() => products.id),
  variantId:    uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  productName:  text('product_name').notNull(),    // snapshot
  size:         text('size').notNull(),
  color:        text('color'),
  qty:          integer('qty').notNull(),
  unitPrice:    numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
})

export const orderStatusHistory = pgTable('order_status_history', {
  id:        uuid('id').primaryKey().defaultRandom(),
  orderId:   uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  status:    orderStatusEnum('status').notNull(),
  note:      text('note'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── ENVÍOS ────────────────────────────────────────────────────
export const shipments = pgTable('shipments', {
  id:                uuid('id').primaryKey().defaultRandom(),
  orderId:           uuid('order_id').references(() => orders.id).notNull(),
  carrier:           text('carrier'),
  trackingNumber:    text('tracking_number'),
  estimatedDelivery: timestamp('estimated_delivery'),
  shippedAt:         timestamp('shipped_at'),
  deliveredAt:       timestamp('delivered_at'),
  quoteJson:         jsonb('quote_json'),
})

// ── PAGOS ─────────────────────────────────────────────────────
export const payments = pgTable('payments', {
  id:              uuid('id').primaryKey().defaultRandom(),
  orderId:         uuid('order_id').references(() => orders.id).notNull(),
  provider:        text('provider').notNull(),   // stripe | mercadopago | conekta
  providerPaymentId: text('provider_payment_id'),
  status:          paymentStatusEnum('status').default('pending').notNull(),
  amount:          numeric('amount', { precision: 10, scale: 2 }).notNull(),
  method:          text('method'),               // card | oxxo | transfer
  metadata:        jsonb('metadata'),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
})

// ── CONTENIDO ─────────────────────────────────────────────────
export const banners = pgTable('banners', {
  id:       uuid('id').primaryKey().defaultRandom(),
  title:    text('title').notNull(),
  imageUrl: text('image_url').notNull(),
  link:     text('link'),
  position: text('position').default('hero').notNull(),
  active:   boolean('active').default(true).notNull(),
  startsAt: timestamp('starts_at'),
  endsAt:   timestamp('ends_at'),
})

export const settings = pgTable('settings', {
  key:       text('key').primaryKey(),
  value:     text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── RELATIONS ─────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  sessions:  many(sessions),
  addresses: many(addresses),
  orders:    many(orders),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  drop:     one(drops,      { fields: [products.dropId],      references: [drops.id]      }),
  images:   many(productImages),
  variants: many(productVariants),
}))

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}))

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}))

export const dropsRelations = relations(drops, ({ many }) => ({
  products: many(products),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user:           one(users,     { fields: [orders.userId],     references: [users.id]     }),
  discount:       one(discounts, { fields: [orders.discountId], references: [discounts.id] }),
  items:          many(orderItems),
  statusHistory:  many(orderStatusHistory),
  shipment:       one(shipments, { fields: [orders.id], references: [shipments.orderId]   }),
  payment:        one(payments,  { fields: [orders.id], references: [payments.orderId]    }),
}))

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}))

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
}))
