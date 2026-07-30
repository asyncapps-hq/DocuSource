import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CitationSchema, GroundedAnswerSchema } from './index.js'

test('citation schema', () => {
  const c = CitationSchema.parse({
    documentId: 'd1',
    chunkId: 'c1',
    title: 'Hardware',
    quote: '$1,500 USD',
    startOffset: 10,
    endOffset: 40,
    score: 0.9,
  })
  assert.equal(c.quote.includes('1,500'), true)
})

test('grounded answer requires citations shape', () => {
  const a = GroundedAnswerSchema.parse({
    answer: 'Budget is $1,500 [1]',
    citations: [
      {
        documentId: 'd1',
        chunkId: 'c1',
        title: 'Hardware',
        quote: 'annual remote hardware budget of **$1,500 USD**',
        startOffset: 1,
        endOffset: 50,
        score: 0.8,
      },
    ],
    refused: false,
    mode: 'extractive',
    followUps: [],
  })
  assert.equal(a.citations.length, 1)
})
