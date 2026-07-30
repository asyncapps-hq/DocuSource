#!/usr/bin/env node
const url = process.env.EMBEDDER_URL || 'http://127.0.0.1:8090'
const out = {
  product: 'DocuSource by KhyFee',
  node: process.version,
  demo: process.env.DOCUSOURCE_DEMO !== '0',
  ai: process.env.DOCUSOURCE_AI === '1',
  embedderUrl: url,
  supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
}
console.log(JSON.stringify(out, null, 2))
try {
  const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) })
  console.log('embedder', r.status, await r.text())
} catch (e) {
  console.log('embedder unreachable (ok for demo mode)', String(e.message || e))
}
