'use client'

import { useState } from 'react'

export default function SettingsPage() {
  const [token, setToken] = useState<string | null>(null)
  return (
    <div>
      <h1 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Settings</h1>
      <div className="panel" style={{ marginBottom: '1rem' }}>
        <h3>AI consent</h3>
        <p className="muted">Off by default. Opt-in via DOCUSOURCE_AI=1 and workspace toggle.</p>
        <label>
          <input type="checkbox" disabled /> Enable organization AI answers
        </label>
      </div>
      <div className="panel">
        <h3>API tokens</h3>
        <button
          className="btn"
          type="button"
          onClick={async () => {
            const res = await fetch('/api/tokens', { method: 'POST' })
            const json = (await res.json()) as { token: string }
            setToken(json.token)
          }}
        >
          Generate token
        </button>
        {token && <pre style={{ overflow: 'auto' }}>{token}</pre>}
      </div>
    </div>
  )
}
