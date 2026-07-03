import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const { rows } = await pool.query(
  `UPDATE users SET role = 'admin' WHERE email = 'cr0acum2@gmail.com' RETURNING id, email, role`
)

if (rows.length === 0) {
  console.log('❌ Usuario no encontrado')
} else {
  console.log('✅ Admin asignado:', rows[0])
}

await pool.end()
