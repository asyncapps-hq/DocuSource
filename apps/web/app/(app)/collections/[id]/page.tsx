import Link from 'next/link'
import { allDocuments, demoCollections } from '@/lib/demo-corpus'

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const col = demoCollections.find((c) => c.id === id) || demoCollections[0]!
  const docs = allDocuments().filter((d) => d.collectionIds.includes(col.id))
  return (
    <div>
      <h1 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Collection: {col.name}</h1>
      <p className="muted">
        {demoCollections.map((c) => (
          <Link key={c.id} href={`/collections/${c.id}`} style={{ marginRight: '0.75rem' }}>
            {c.name}
          </Link>
        ))}
      </p>
      <ul>
        {docs.map((d) => (
          <li key={d.id}>
            <Link href={`/documents/${d.id}`}>{d.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
