import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const sql = `
DROP TABLE IF EXISTS
  verifications, order_status_history, order_items, payments, shipments,
  orders, product_discounts, discounts, product_variants, product_images,
  products, drops, categories, addresses, accounts, sessions, users,
  banners, settings
CASCADE;

DROP TYPE IF EXISTS user_role, order_status, discount_type, channel, payment_status CASCADE;
`

await pool.query(sql)
console.log('✅ Todas las tablas borradas')
await pool.end()
