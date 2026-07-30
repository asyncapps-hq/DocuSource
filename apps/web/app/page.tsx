import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="container">
      <header className="nav">
        <div className="logo">
          Docu<span>Source</span>
        </div>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/docs">Docs</Link>
          <Link href="/security">Security</Link>
          <Link href="/library">Library</Link>
          <Link className="btn" href="/demo">
            Live demo
          </Link>
        </nav>
      </header>
      <section style={{ padding: '4rem 0 3rem', maxWidth: 720 }}>
        <p className="muted">Enterprise Knowledge RAG</p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.4rem, 6vw, 4rem)',
            letterSpacing: '-.03em',
            margin: '.35rem 0 1rem',
            lineHeight: 1.05,
          }}
        >
          DocuSource
        </h1>
        <p className="muted" style={{ fontSize: '1.15rem', maxWidth: 540 }}>
          Ask internal policy questions and jump to the exact source paragraph — embeddings stay local,
          answers stay grounded, LLM summarization is opt-in.
        </p>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <Link className="btn" href="/demo">
            Try the hardware budget demo
          </Link>
          <Link className="btn ghost" href="/chat">
            Open chat
          </Link>
        </div>
      </section>
    </div>
  )
}
