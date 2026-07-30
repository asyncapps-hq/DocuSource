'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Document } from '@docusource/shared'

export default function LibraryPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [status, setStatus] = useState('')

  async function refresh() {
    const res = await fetch('/api/documents')
    const json = (await res.json()) as { documents: Document[] }
    setDocs(json.documents)
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div>
      <h1 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Library</h1>
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          setStatus('uploading…')
          const res = await fetch('/api/documents', { method: 'POST', body: fd })
          setStatus(res.ok ? 'ready' : await res.text())
          await refresh()
        }}
      >
        <input type="file" name="file" accept=".md,.txt,application/pdf" required data-testid="upload-input" />
        <button className="btn" type="submit" style={{ marginLeft: '.5rem' }}>
          Upload
        </button>
        <span className="muted" style={{ marginLeft: '.75rem' }} data-testid="upload-status">
          {status}
        </span>
      </form>
      <ul>
        {docs.map((d) => (
          <li key={d.id}>
            <Link href={`/documents/${d.id}`}>
              {d.title} <span className="muted">({d.status})</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
