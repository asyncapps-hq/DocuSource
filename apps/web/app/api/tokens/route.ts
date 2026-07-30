import { NextResponse } from 'next/server'
import { createToken, hashToken } from '@/lib/security'

export async function POST() {
  const token = createToken()
  return NextResponse.json({ token, hash: hashToken(token), note: 'Shown once. Hashed at rest.' })
}
