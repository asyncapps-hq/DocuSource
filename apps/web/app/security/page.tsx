export default function SecurityPage() {
  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ fontFamily: 'var(--font-display)' }}>Security</h1>
      <ul className="panel">
        <li>Answers require citations when evidence exists; otherwise refuse</li>
        <li>LLM receives redacted retrieved chunks only (opt-in)</li>
        <li>Supabase RLS on tenant tables; private document storage</li>
        <li>MIME/size limits on upload; hashed API tokens</li>
      </ul>
    </div>
  )
}
