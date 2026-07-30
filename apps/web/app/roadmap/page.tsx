export default function RoadmapPage() {
  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ fontFamily: 'var(--font-display)' }}>Roadmap</h1>
      <ul className="panel">
        <li>Notion/Slack sync connectors</li>
        <li>Better table parsing / OCR</li>
        <li>SSO and alternate embedding models</li>
      </ul>
    </div>
  )
}
