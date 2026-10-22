const { readFileSync } = require('node:fs')
const { Pool, neonConfig } = require('@neondatabase/serverless')
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd())
neonConfig.webSocketConstructor = require('ws')
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env.local')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  try { await client.query('BEGIN'); await client.query(readFileSync('migrations/001_ai.sql', 'utf8')); await client.query('COMMIT'); console.log('AI mirror migration complete') }
  catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release(); await pool.end() }
}
main().catch(error => { console.error('Migration failed. Check DATABASE_URL and database connectivity.', error.code && /^[A-Z0-9_]+$/.test(error.code) ? `Code: ${error.code}` : ''); process.exitCode = 1 })
