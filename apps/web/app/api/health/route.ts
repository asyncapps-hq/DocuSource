import { NextResponse } from 'next/server'

export async function GET() {
  let embedder = 'unchecked'
  const url = process.env.EMBEDDER_URL
  if (url) {
    try {
      const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) })
      embedder = r.ok ? 'ok' : 'down'
    } catch {
      embedder = 'unreachable'
    }
  } else embedder = 'unset'
  return NextResponse.json({
    name: 'docusource',
    version: '0.1.0',
    author: 'KhyFee',
    demo: process.env.DOCUSOURCE_DEMO !== '0',
    ai: process.env.DOCUSOURCE_AI === '1',
    embedder,
    ok: true,
  })
}
