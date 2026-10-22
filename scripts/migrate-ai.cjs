const fs=require('node:fs')
require('@next/env').loadEnvConfig(process.cwd())
const {Pool,neonConfig}=require('@neondatabase/serverless');neonConfig.webSocketConstructor=require('ws')
const {load}=require('./ts-loader.cjs')
async function main(){if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL in .env.local');const pool=new Pool({connectionString:process.env.DATABASE_URL});const c=await pool.connect();try{await c.query('BEGIN');await c.query(fs.readFileSync('migrations/002_hardware.sql','utf8'));await c.query('INSERT INTO hardware.app_state(id,data) VALUES(1,$1::jsonb) ON CONFLICT(id) DO NOTHING',[JSON.stringify(load('lib/db.ts').initialDatabase)]);await c.query('COMMIT');console.log('Hardware migration complete. Existing public mirror tables are preserved. Run npm run db:seed for demo records.')}catch(e){await c.query('ROLLBACK');throw e}finally{c.release();await pool.end()}}
main().catch(e=>{console.error('Migration failed:',e.code||'Check DATABASE_URL and connectivity');process.exitCode=1})
