import { NextResponse } from 'next/server'
import { answerQuestion } from '@/lib/rag'
import { allChunks, allDocuments } from '@/lib/demo-corpus'
import { rateLimit } from '@/lib/security'

export async function POST(req: Request) {
  if (!rateLimit('chat:' + (req.headers.get('x-forwarded-for') || 'local'), 60)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 })
  }
  const body = (await req.json()) as { question?: string }
  const question = (body.question || '').trim()
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 })
  const result = await answerQuestion(question, allChunks(), allDocuments())
  return NextResponse.json(result)
}
