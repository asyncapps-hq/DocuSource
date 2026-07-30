export default function A11yPage() {
  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ fontFamily: 'var(--font-display)' }}>Accessibility</h1>
      <ul className="panel">
        <li>Citation highlights use outline + mark (not color alone)</li>
        <li>prefers-reduced-motion and ?motion=off disable Anime.js</li>
        <li>Citation chips expose aria-labels; keyboard j/k cycles cites</li>
      </ul>
    </div>
  )
}
