import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chunkMarkdown, checksum } from './index.js'

test('chunk offsets round-trip into source', () => {
  const src = '# Title\n\nHello world paragraph.\n\n## Benefits > Hardware\n\nbudget of $1,500 USD here.\n'
  const chunks = chunkMarkdown('doc1', src)
  assert.ok(chunks.length >= 1)
  for (const c of chunks) {
    assert.equal(src.slice(c.startOffset, c.endOffset), c.content)
  }
  assert.equal(checksum(src).length, 64)
})
