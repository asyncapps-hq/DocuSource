'use client'

import { useState } from 'react'

export default function EvalsPage() {
  const [out, setOut] = useState<string>('')
  return (
    <div>
      <h1 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Evals</h1>
      <button
        className="btn"
        type="button"
        onClick={async () => {
          const res = await fetch('/api/evals', { method: 'POST' })
          setOut(JSON.stringify(await res.json(), null, 2))
        }}
      >
        Run golden suite
      </button>
      <pre className="panel" style={{ marginTop: '1rem' }}>
        {out || 'No run yet'}
      </pre>
    </div>
  )
}
