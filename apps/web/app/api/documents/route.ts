import { NextResponse } from 'next/server'
import { ingestMarkdown, allDocuments } from '@/lib/demo-corpus'
import { rateLimit } from '@/lib/security'

export async function GET() {
  return NextResponse.json({ documents: allDocuments() })
}

export async function POST(req: Request) {
  if (!rateLimit('upload:' + (req.headers.get('x-forwarded-for') || 'local'), 20)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 })
  }
  const ct = req.headers.get('content-type') || ''
  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })
    const mime = file.type || 'text/plain'
    if (!['text/markdown', 'text/plain', 'application/pdf'].includes(mime) && !file.name.endsWith('.md')) {
      return NextResponse.json({ error: 'MIME not allowed' }, { status: 400 })
    }
    if (file.size > 2_000_000) return NextResponse.json({ error: 'too large' }, { status: 400 })
    if (mime === 'application/pdf') {
      const embedder = process.env.EMBEDDER_URL
      if (!embedder) {
        return NextResponse.json({ error: 'PDF requires EMBEDDER_URL' }, { status: 503 })
      }
      const fd = new FormData()
      fd.append('file', file)
      const er = await fetch(`${embedder}/extract/pdf`, { method: 'POST', body: fd })
      if (!er.ok) return NextResponse.json({ error: await er.text() }, { status: 422 })
      const extracted = (await er.json()) as { text: string }
      const doc = ingestMarkdown(file.name, extracted.text)
      return NextResponse.json({ document: doc }, { status: 201 })
    }
    const text = await file.text()
    const doc = ingestMarkdown(file.name.replace(/\.md$/i, ''), text)
    return NextResponse.json({ document: doc }, { status: 201 })
  }
  const body = (await req.json()) as { title?: string; content?: string }
  if (!body.content) return NextResponse.json({ error: 'content required' }, { status: 400 })
  const doc = ingestMarkdown(body.title || 'Untitled', body.content)
  return NextResponse.json({ document: doc }, { status: 201 })
}
