import { NextResponse } from 'next/server'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { answerQuestion } from '@/lib/rag'
import { allChunks, allDocuments } from '@/lib/demo-corpus'
import type { EvalCase } from '@docusource/shared'

export async function POST() {
  let cases: EvalCase[] = []
  try {
    const p = path.join(process.cwd(), '..', '..', 'fixtures', 'evals', 'golden.json')
    cases = JSON.parse(readFileSync(p, 'utf8')) as EvalCase[]
  } catch {
    cases = [
      { id: 'eval-hardware-budget', question: 'What is our remote hardware budget?', mustCiteContains: ['$1,500'], mustRefuse: false },
      { id: 'eval-unknown', question: 'What is the pet insurance reimbursement for turtles?', mustCiteContains: [], mustRefuse: true },
    ]
  }
  const results = []
  for (const c of cases) {
    const ans = await answerQuestion(c.question, allChunks(), allDocuments())
    const blob = `${ans.answer}\n${ans.citations.map((x) => x.quote).join('\n')}`
    const citeOk = c.mustRefuse
      ? ans.refused
      : c.mustCiteContains.every((s) => blob.includes(s)) && ans.citations.length > 0
    results.push({ id: c.id, pass: citeOk, refused: ans.refused, citations: ans.citations.length })
  }
  const passed = results.filter((r) => r.pass).length
  return NextResponse.json({ passed, total: results.length, results })
}
