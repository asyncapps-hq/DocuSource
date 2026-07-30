import type { Chunk, Citation, GroundedAnswer } from '@docusource/shared'
import { EMBEDDING_DIM } from '@docusource/shared'

export function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!
    na += a[i]! * a[i]!
    nb += b[i]! * b[i]!
  }
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/** Deterministic bag-of-words embedding for demo/CI without GPU. */
export function lexicalEmbed(text: string, dim = EMBEDDING_DIM): number[] {
  const v = new Array(dim).fill(0) as number[]
  const tokens = text.toLowerCase().match(/[a-z0-9$.,]+/g) || []
  for (const t of tokens) {
    let h = 2166136261
    for (let i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    const idx = (h >>> 0) % dim
    v[idx]! += 1
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map((x) => x / norm)
}

export function sparseScore(query: string, content: string): number {
  const q = new Set((query.toLowerCase().match(/[a-z0-9$.,]+/g) || []).filter((t) => t.length > 1))
  if (!q.size) return 0
  const c = content.toLowerCase()
  let hits = 0
  for (const t of q) if (c.includes(t)) hits++
  return hits / q.size
}

export function rrfFuse(
  dense: Array<{ id: string; score: number }>,
  sparse: Array<{ id: string; score: number }>,
  k = 60,
): Map<string, number> {
  const scores = new Map<string, number>()
  dense.forEach((r, i) => scores.set(r.id, (scores.get(r.id) || 0) + 1 / (k + i + 1)))
  sparse.forEach((r, i) => scores.set(r.id, (scores.get(r.id) || 0) + 1 / (k + i + 1)))
  return scores
}

export function mmrSelect(
  candidates: Array<{ chunk: Chunk; score: number }>,
  k: number,
  lambda = 0.7,
): Array<{ chunk: Chunk; score: number }> {
  const selected: Array<{ chunk: Chunk; score: number }> = []
  const rest = [...candidates]
  while (selected.length < k && rest.length) {
    let bestIdx = 0
    let best = -Infinity
    for (let i = 0; i < rest.length; i++) {
      const cand = rest[i]!
      const emb = cand.chunk.embedding || lexicalEmbed(cand.chunk.content)
      let maxSim = 0
      for (const s of selected) {
        const se = s.chunk.embedding || lexicalEmbed(s.chunk.content)
        maxSim = Math.max(maxSim, cosine(emb, se))
      }
      const mmr = lambda * cand.score - (1 - lambda) * maxSim
      if (mmr > best) {
        best = mmr
        bestIdx = i
      }
    }
    selected.push(rest.splice(bestIdx, 1)[0]!)
  }
  return selected
}

export function hybridRetrieve(
  query: string,
  chunks: Chunk[],
  opts: { topK?: number; finalK?: number; scoreFloor?: number; queryEmbedding?: number[] } = {},
): { hits: Array<{ chunk: Chunk; score: number }>; mode: 'hybrid'; bestScore: number; insufficient: boolean } {
  const topK = opts.topK ?? 8
  const finalK = opts.finalK ?? 5
  const floor = opts.scoreFloor ?? 0.12
  const qEmb = opts.queryEmbedding || lexicalEmbed(query)

  const dense = chunks
    .map((chunk) => ({
      id: chunk.id,
      chunk,
      score: cosine(qEmb, chunk.embedding || lexicalEmbed(chunk.content)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  const sparse = chunks
    .map((chunk) => ({
      id: chunk.id,
      chunk,
      score: sparseScore(query, chunk.content),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  const fused = rrfFuse(
    dense.map((d) => ({ id: d.id, score: d.score })),
    sparse.map((s) => ({ id: s.id, score: s.score })),
  )
  const byId = new Map(chunks.map((c) => [c.id, c]))
  const ranked = [...fused.entries()]
    .map(([id, score]) => ({ chunk: byId.get(id)!, score }))
    .filter((x) => x.chunk)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  const hits = mmrSelect(ranked, finalK)
  const bestDense = hits.reduce((m, h) => {
    const emb = h.chunk.embedding || lexicalEmbed(h.chunk.content)
    return Math.max(m, cosine(qEmb, emb))
  }, 0)
  const bestSparse = hits.reduce((m, h) => Math.max(m, sparseScore(query, h.chunk.content)), 0)
  const bestScore = Math.max(bestDense, bestSparse, hits[0]?.score ?? 0)
  // ponytail: RRF ranks are tiny; gate on calibrated dense/sparse similarity
  const insufficient = hits.length === 0 || (bestDense < floor && bestSparse < 0.2)
  return { hits, mode: 'hybrid', bestScore, insufficient }
}

export function redactForLlm(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
    .replace(/\b\+?\d[\d\s().-]{8,}\d\b/g, '[PHONE]')
}

export function normalizeWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function validateCitations(
  answer: string,
  citations: Citation[],
  pack: Array<{ n: number; chunk: Chunk }>,
): { ok: boolean; reason?: string } {
  if (!citations.length) return { ok: false, reason: 'missing citations' }
  const byN = new Map(pack.map((p) => [p.n, p.chunk]))
  const markers = [...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]))
  for (const n of markers) {
    if (!byN.has(n)) return { ok: false, reason: `unknown citation [${n}]` }
  }
  for (const c of citations) {
    const chunk = pack.find((p) => p.chunk.id === c.chunkId)?.chunk
    if (!chunk) return { ok: false, reason: 'citation chunk not in pack' }
    if (!normalizeWs(chunk.content).includes(normalizeWs(c.quote).slice(0, 40))) {
      // soft: quote should appear in chunk
      if (!chunk.content.includes(c.quote.slice(0, Math.min(20, c.quote.length)))) {
        return { ok: false, reason: 'quote not found in chunk' }
      }
    }
  }
  return { ok: true }
}

export function extractiveAnswer(
  query: string,
  hits: Array<{ chunk: Chunk; score: number }>,
  docTitle: (id: string) => string,
): GroundedAnswer {
  if (!hits.length) {
    return {
      answer: 'I could not find enough evidence in the uploaded policies to answer that.',
      citations: [],
      refused: true,
      refusalReason: 'insufficient evidence',
      mode: 'extractive',
      followUps: [],
      retrieval: { mode: 'hybrid', hitCount: 0, bestScore: 0 },
    }
  }
  const pack = hits.map((h, i) => ({ n: i + 1, chunk: h.chunk, score: h.score }))
  const citations: Citation[] = pack.map((p) => ({
    documentId: p.chunk.documentId,
    chunkId: p.chunk.id,
    title: docTitle(p.chunk.documentId),
    quote: p.chunk.content.slice(0, 240),
    startOffset: p.chunk.startOffset,
    endOffset: p.chunk.endOffset,
    score: p.score,
    headingPath: p.chunk.headingPath,
  }))
  const bullets = pack.map((p) => `- [${p.n}] ${p.chunk.content.replace(/\s+/g, ' ').slice(0, 180)}`)
  const answer = `Based on the retrieved policy excerpts:\n${bullets.join('\n')}`
  const followUps = [
    ...new Set(pack.map((p) => p.chunk.headingPath).filter(Boolean).map((h) => `Tell me more about ${h}`)),
  ].slice(0, 3)
  return {
    answer,
    citations,
    refused: false,
    mode: 'extractive',
    followUps,
    retrieval: { mode: 'hybrid', hitCount: hits.length, bestScore: hits[0]?.score ?? 0 },
  }
}
