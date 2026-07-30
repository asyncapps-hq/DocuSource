import { DocumentViewer } from '@/components/DocumentViewer'
import { allDocuments } from '@/lib/demo-corpus'

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ start?: string; end?: string; chunk?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const doc = allDocuments().find((d) => d.id === id)
  if (!doc) return <p>Document not found</p>
  const start = sp.start ? Number(sp.start) : undefined
  const end = sp.end ? Number(sp.end) : undefined
  return (
    <div>
      <h1 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>
        {doc.title} <span className="muted">v{doc.version}</span>
      </h1>
      {doc.parseWarnings?.length ? <p className="muted">Warnings: {doc.parseWarnings.join('; ')}</p> : null}
      <DocumentViewer content={doc.content} start={start} end={end} />
    </div>
  )
}
