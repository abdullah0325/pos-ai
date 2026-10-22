const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const base = 'http://127.0.0.1:3017'
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3017', '-H', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' })
async function post(path, body) {
  return fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) })
}
async function main() {
  let ready = false
  for (let i = 0; i < 60; i++) {
    try { const response = await fetch(base, { signal: AbortSignal.timeout(1000) }); if (response.ok) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert.ok(ready, 'Built server should start')
  assert.equal((await post('/api/scan-bill', { image: 'invalid' })).status, 400)
  assert.equal((await post('/api/parse-sale', { transcript: '', products: [], customers: [] })).status, 400)
  assert.equal((await post('/api/mirror', {})).status, 400)
  const form = new FormData()
  assert.equal((await fetch(base + '/api/transcribe', { method: 'POST', body: form })).status, 400)
  // Validate the real Pool transaction without creating POC business records.
  const mirror = await post('/api/mirror', { products: [], raw_materials: [], purchases: [], sales: [], expenses: [], movements: [] })
  assert.equal(mirror.status, 200, 'Configured Neon empty transaction should commit')
  assert.equal((await mirror.json()).synced, true)
  console.log('Built API smoke checks passed: app response, invalid scan/sale/audio/mirror rejection, real Neon transaction.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => server.kill())
