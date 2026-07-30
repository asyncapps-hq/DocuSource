import Link from 'next/link'

const LINKS = [
  ['/library', 'Library'],
  ['/collections/col-hr', 'Collections'],
  ['/chat', 'Chat'],
  ['/demo', 'Demo'],
  ['/settings', 'Settings'],
  ['/evals', 'Evals'],
  ['/', 'Marketing'],
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '1rem' }}>
          Docu<span>Source</span>
        </div>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
