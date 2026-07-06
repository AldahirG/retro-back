import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.ts'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max:             20,   // conexiones simultáneas al DB
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

export const db = drizzle(pool, { schema })
export type DB = typeof db
