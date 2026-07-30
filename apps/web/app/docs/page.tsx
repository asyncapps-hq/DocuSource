export default function DocsPage() {
  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ fontFamily: 'var(--font-display)' }}>Docs</h1>
      <pre className="panel">{`npm install
npm run build
npm run dev
# open /demo

# optional embedder
cd services/embedder && pip install -r requirements.txt
uvicorn app:app --port 8090

# opt-in LLM
DOCUSOURCE_AI=1 OPENAI_API_KEY=...`}</pre>
    </div>
  )
}
