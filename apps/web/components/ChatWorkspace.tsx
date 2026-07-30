'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { Citation, GroundedAnswer } from '@docusource/shared'
import { DocumentViewer } from '@/components/DocumentViewer'
import { DEMO_QUESTION } from '@/lib/demo-corpus'

type DocPayload = { id: string; title: string; content: string }

export function ChatWorkspace({
  initialQuestion = '',
  autoAsk = false,
}: {
  initialQuestion?: string
  autoAsk?: boolean
}) {
  const [question, setQuestion] = useState(initialQuestion || DEMO_QUESTION)
  const [answer, setAnswer] = useState<GroundedAnswer | null>(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState<Citation | null>(null)
  const [doc, setDoc] = useState<DocPayload | null>(null)
  const [citeIdx, setCiteIdx] = useState(0)

  const ask = useCallback(async (q: string) => {
    setLoading(true)
    setAnswer(null)
    setActive(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const json = (await res.json()) as GroundedAnswer
      setAnswer(json)
      if (json.citations[0]) {
        setCiteIdx(0)
        await openCite(json.citations[0])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  async function openCite(c: Citation) {
    setActive(c)
    const res = await fetch(`/api/documents/${c.documentId}`)
    const json = (await res.json()) as { document: DocPayload }
    setDoc(json.document)
  }

  useEffect(() => {
    if (autoAsk && initialQuestion) void ask(initialQuestion)
  }, [autoAsk, initialQuestion, ask])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!answer?.citations.length) return
      if (e.key === 'j') {
        const next = (citeIdx + 1) % answer.citations.length
        setCiteIdx(next)
        void openCite(answer.citations[next]!)
      }
      if (e.key === 'k') {
        const next = (citeIdx - 1 + answer.citations.length) % answer.citations.length
        setCiteIdx(next)
        void openCite(answer.citations[next]!)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer, citeIdx])

  return (
    <div className="split">
      <div className="panel">
        <h2 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Chat</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void ask(question)
          }}
          style={{ display: 'flex', gap: '.5rem' }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            aria-label="Question"
            data-testid="chat-input"
            style={{ flex: 1, padding: '.7rem .85rem', borderRadius: 12, border: '1px solid var(--line)' }}
          />
          <button className="btn" type="submit" disabled={loading} data-testid="chat-ask">
            {loading ? '…' : 'Ask'}
          </button>
        </form>
        {answer && (
          <div style={{ marginTop: '1rem' }} data-testid="chat-answer">
            {answer.refused ? (
              <p className="muted">{answer.answer}</p>
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{answer.answer}</pre>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginTop: '.75rem' }}>
              {answer.citations.map((c, i) => (
                <button
                  key={c.chunkId}
                  type="button"
                  className="chip"
                  data-testid="citation-chip"
                  aria-label={`Citation ${i + 1} ${c.title}`}
                  onClick={() => {
                    setCiteIdx(i)
                    void openCite(c)
                  }}
                >
                  [{i + 1}] {c.title}
                </button>
              ))}
            </div>
            {active && (
              <p className="muted" style={{ fontSize: '.85rem' }}>
                Deep link:{' '}
                <Link
                  href={`/documents/${active.documentId}?start=${active.startOffset}&end=${active.endOffset}&chunk=${active.chunkId}`}
                  data-testid="citation-link"
                >
                  open source span
                </Link>
              </p>
            )}
            {answer.followUps?.length ? (
              <ul className="muted">
                {answer.followUps.map((f) => (
                  <li key={f}>
                    <button type="button" className="chip" onClick={() => { setQuestion(f); void ask(f) }}>
                      {f}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>
      <div>
        <h2 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Source</h2>
        {doc ? (
          <DocumentViewer content={doc.content} start={active?.startOffset} end={active?.endOffset} />
        ) : (
          <div className="panel muted">Ask a question, then click a citation to highlight the source.</div>
        )}
      </div>
    </div>
  )
}
