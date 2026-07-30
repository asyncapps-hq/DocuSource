import { hybridRetrieve, extractiveAnswer, redactForLlm, validateCitations } from '@docusource/retriever'
import type { Chunk, Document, GroundedAnswer } from '@docusource/shared'
import { GroundedAnswerSchema } from '@docusource/shared'

export async function answerQuestion(
  question: string,
  chunks: Chunk[],
  documents: Document[],
): Promise<GroundedAnswer> {
  const titleOf = (id: string) => documents.find((d) => d.id === id)?.title || id
  const { hits, insufficient, bestScore, mode } = hybridRetrieve(question, chunks, { scoreFloor: 0.08 })

  if (insufficient) {
    return {
      answer: 'Insufficient evidence in the indexed policies to answer that safely.',
      citations: [],
      refused: true,
      refusalReason: 'insufficient evidence',
      mode: 'extractive',
      followUps: [],
      retrieval: { mode, hitCount: hits.length, bestScore },
    }
  }

  let result = extractiveAnswer(question, hits, titleOf)

  if (process.env.DOCUSOURCE_AI === '1' && process.env.OPENAI_API_KEY) {
    const llm = await maybeLlmAnswer(question, hits, titleOf)
    if (llm) result = llm
  }

  return GroundedAnswerSchema.parse(result)
}

async function maybeLlmAnswer(
  question: string,
  hits: Array<{ chunk: Chunk; score: number }>,
  titleOf: (id: string) => string,
): Promise<GroundedAnswer | null> {
  const pack = hits.map((h, i) => ({ n: i + 1, chunk: h.chunk, score: h.score }))
  const excerpts = pack
    .map((p) => `[${p.n}] (${titleOf(p.chunk.documentId)} / ${p.chunk.headingPath})\n${redactForLlm(p.chunk.content)}`)
    .join('\n\n')
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              'You are DocuSource. Answer ONLY from the numbered excerpts. Cite as [n]. If unsure, say insufficient evidence. Never invent dollar amounts or policies. Return JSON: {answer, citationNumbers:number[], refused:boolean}',
          },
          { role: 'user', content: `Question: ${question}\n\nExcerpts:\n${excerpts}` },
        ],
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const parsed = JSON.parse(json.choices?.[0]?.message?.content || '{}') as {
      answer?: string
      citationNumbers?: number[]
      refused?: boolean
    }
    if (parsed.refused || !parsed.answer) return null
    const nums = parsed.citationNumbers?.length
      ? parsed.citationNumbers
      : [...parsed.answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]))
    const citations = nums
      .map((n) => {
        const p = pack.find((x) => x.n === n)
        if (!p) return null
        return {
          documentId: p.chunk.documentId,
          chunkId: p.chunk.id,
          title: titleOf(p.chunk.documentId),
          quote: p.chunk.content.slice(0, 240),
          startOffset: p.chunk.startOffset,
          endOffset: p.chunk.endOffset,
          score: p.score,
          headingPath: p.chunk.headingPath,
        }
      })
      .filter(Boolean) as GroundedAnswer['citations']

    const check = validateCitations(parsed.answer, citations, pack)
    if (!check.ok || !citations.length) return null
    return {
      answer: parsed.answer,
      citations,
      refused: false,
      mode: 'llm',
      followUps: [],
      retrieval: { mode: 'hybrid', hitCount: hits.length, bestScore: hits[0]?.score ?? 0 },
      provider: 'openai-compatible',
      model,
    }
  } catch {
    return null
  }
}
