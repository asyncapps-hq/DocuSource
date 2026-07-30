import type { Chunk } from '@docusource/shared'
import { createHash } from 'node:crypto'

export function checksum(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** Approximate token count — ponytail: words/0.75, upgrade to tiktoken if billing matters. */
export function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 0.75))
}

export function chunkMarkdown(
  documentId: string,
  text: string,
  opts: { maxTokens?: number; overlapTokens?: number } = {},
): Chunk[] {
  const maxTokens = opts.maxTokens ?? 500
  const overlapTokens = opts.overlapTokens ?? 50
  const lines = text.split(/\n/)
  const sections: { heading: string; body: string; start: number }[] = []
  let heading = ''
  let body: string[] = []
  let start = 0
  let offset = 0

  const flush = (endOffset: number) => {
    const content = body.join('\n').trim()
    if (content) sections.push({ heading, body: content, start })
    body = []
    start = endOffset
  }

  for (const line of lines) {
    const lineStart = offset
    const next = offset + line.length + 1
    const h = /^(#{1,6})\s+(.+)$/.exec(line)
    if (h) {
      flush(lineStart)
      heading = h[2]!.trim()
      offset = next
      continue
    }
    body.push(line)
    offset = next
  }
  flush(text.length)

  const chunks: Chunk[] = []
  let ordinal = 0
  for (const sec of sections.length ? sections : [{ heading: '', body: text, start: 0 }]) {
    const packed = packText(sec.body, maxTokens, overlapTokens)
    let local = 0
    for (const part of packed) {
      const idx = text.indexOf(part, sec.start + local)
      const startOffset = idx >= 0 ? idx : sec.start + local
      const endOffset = startOffset + part.length
      local = Math.max(local, endOffset - sec.start)
      const tableDense = (part.match(/\|/g) || []).length >= 4
      chunks.push({
        id: `${documentId}_c${ordinal}`,
        documentId,
        ordinal,
        content: part,
        startOffset,
        endOffset,
        headingPath: sec.heading,
        tableDense,
      })
      ordinal++
    }
  }
  return chunks
}

function packText(text: string, maxTokens: number, overlapTokens: number): string[] {
  const words = text.split(/(\s+)/)
  const parts: string[] = []
  let buf: string[] = []
  let tokens = 0
  const flush = () => {
    const s = buf.join('').trim()
    if (s) parts.push(s)
    if (overlapTokens > 0 && buf.length) {
      const keep = buf.join('').trim().split(/\s+/).slice(-overlapTokens)
      buf = keep.length ? [keep.join(' ') + ' '] : []
      tokens = keep.length
    } else {
      buf = []
      tokens = 0
    }
  }
  for (const w of words) {
    const t = w.trim() ? 1 : 0
    if (tokens + t > maxTokens && buf.length) flush()
    buf.push(w)
    tokens += t
  }
  flush()
  return parts.length ? parts : [text]
}
