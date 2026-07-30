import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashToken, rateLimit, signBody, verifyBody } from './security.js'

test('hash + hmac', () => {
  const h = hashToken('ds_abc')
  assert.equal(h.length, 64)
  const body = '{"q":1}'
  const sig = signBody('secret', body)
  assert.equal(verifyBody('secret', body, sig), true)
})

test('rate limit', () => {
  const k = 'test-' + Math.random()
  assert.equal(rateLimit(k, 2, 60_000), true)
  assert.equal(rateLimit(k, 2, 60_000), true)
  assert.equal(rateLimit(k, 2, 60_000), false)
})
