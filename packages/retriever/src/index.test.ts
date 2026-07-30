import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hybridRetrieve, lexicalEmbed, rrfFuse, redactForLlm, validateCitations } from './index.js'
import type { Chunk } from '@docusource/shared'

test('rrf fuse ranks shared ids higher', () => {
  const m = rrfFuse(
    [
      { id: 'a', score: 1 },
      { id: 'b', score: 0.5 },
    ],
    [
      { id: 'b', score: 1 },
      { id: 'c', score: 0.5 },
    ],
  )
  assert.ok((m.get('b') || 0) > (m.get('a') || 0))
})

test('hybrid finds hardware budget', () => {
  const chunks: Chunk[] = [
    {
      id: 'c1',
      documentId: 'd1',
      ordinal: 0,
      content: 'Remote employees receive an annual remote hardware budget of $1,500 USD for approved equipment.',
      startOffset: 0,
      endOffset: 90,
      headingPath: 'Benefits > Hardware',
      embedding: lexicalEmbed(
        'Remote employees receive an annual remote hardware budget of $1,500 USD for approved equipment.',
      ),
    },
    {
      id: 'c2',
      documentId: 'd2',
      ordinal: 0,
      content: 'PTO accrues 1.25 days per month.',
      startOffset: 0,
      endOffset: 30,
      headingPath: 'Accrual',
      embedding: lexicalEmbed('PTO accrues 1.25 days per month.'),
    },
  ]
  const r = hybridRetrieve('What is our remote hardware budget?', chunks, { scoreFloor: 0.05 })
  assert.equal(r.insufficient, false)
  assert.equal(r.hits[0]?.chunk.id, 'c1')
})

test('redact email', () => {
  assert.match(redactForLlm('mail it-ops@example.com now'), /\[EMAIL\]/)
})

test('validate citations', () => {
  const chunk: Chunk = {
    id: 'c1',
    documentId: 'd1',
    ordinal: 0,
    content: 'budget of $1,500 USD',
    startOffset: 0,
    endOffset: 20,
    headingPath: '',
  }
  const ok = validateCitations(
    'The budget is $1,500 [1]',
    [
      {
        documentId: 'd1',
        chunkId: 'c1',
        title: 't',
        quote: 'budget of $1,500 USD',
        startOffset: 0,
        endOffset: 20,
        score: 1,
      },
    ],
    [{ n: 1, chunk }],
  )
  assert.equal(ok.ok, true)
})
