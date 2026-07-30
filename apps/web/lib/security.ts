import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const buckets = new Map<string, { count: number; reset: number }>()

export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (b.count >= limit) return false
  b.count++
  return true
}

export function createToken() {
  return `ds_${randomBytes(24).toString('hex')}`
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function signBody(secret: string, body: string) {
  return createHash('sha256').update(secret + ':' + body).digest('hex')
}

export function verifyBody(secret: string, body: string, sig: string | null) {
  if (!sig) return false
  const expected = signBody(secret, body)
  const a = Buffer.from(expected)
  const b = Buffer.from(sig)
  return a.length === b.length && timingSafeEqual(a, b)
}
