import { chunkMarkdown, checksum } from '@docusource/chunker'
import { lexicalEmbed } from '@docusource/retriever'
import type { Chunk, Document } from '@docusource/shared'

const HARDWARE = `# Remote Hardware & Equipment Policy

## Purpose
This policy defines annual budgets for remote employees who need office equipment to work effectively from home.

## Benefits > Hardware
Remote full-time employees receive an annual remote hardware budget of **$1,500 USD** for approved equipment (laptop peripherals, monitors, chairs, and webcams). Purchases above this amount require manager approval and Finance review.

Unused budget does not roll over to the next calendar year.

## Reimbursement
Submit receipts in the expense system within 30 days. Only business-use equipment is eligible.

## Contact
IT Operations: it-ops@example.com
`

const PTO = `# Paid Time Off (PTO) Policy

## Accrual
Full-time employees accrue 1.25 PTO days per month (15 days per year).

## Requests
Request PTO at least 5 business days in advance via the HR portal. Manager approval is required.

## Carryover
Up to 5 unused PTO days may carry over into the next year.
`

const SECURITY = `# Information Security Policy

## Passwords
Use a password manager. MFA is required for all production systems.

## Devices
Company and BYOD devices must have disk encryption enabled and automatic lock after 5 minutes of idle time.

## Incidents
Report suspected incidents to security@example.com within 24 hours.
`

function load(id: string, title: string, content: string, collectionIds: string[]) {
  const doc: Document = {
    id,
    title,
    mime: 'text/markdown',
    status: 'ready',
    content,
    checksum: checksum(content),
    parseWarnings: [],
    version: 1,
    collectionIds,
  }
  const chunks: Chunk[] = chunkMarkdown(id, content).map((c) => ({
    ...c,
    embedding: lexicalEmbed(c.content),
  }))
  return { doc, chunks }
}

const hardware = load('doc-hardware', 'Remote Hardware Policy', HARDWARE, ['col-hr', 'col-eng'])
const pto = load('doc-pto', 'PTO Policy', PTO, ['col-hr'])
const security = load('doc-security', 'Information Security Policy', SECURITY, ['col-sec'])

export const demoCollections = [
  { id: 'col-hr', name: 'HR' },
  { id: 'col-eng', name: 'Engineering' },
  { id: 'col-sec', name: 'Security' },
]

export const demoDocuments: Document[] = [hardware.doc, pto.doc, security.doc]
export const demoChunks: Chunk[] = [...hardware.chunks, ...pto.chunks, ...security.chunks]

export const DEMO_QUESTION = 'What is our remote hardware budget?'
export const DEMO_QUOTE_SNIPPET = '$1,500'

// in-memory upload store for demo library
const uploadedDocs: Document[] = []
const uploadedChunks: Chunk[] = []

export function allDocuments() {
  return [...demoDocuments, ...uploadedDocs]
}

export function allChunks() {
  return [...demoChunks, ...uploadedChunks]
}

export function ingestMarkdown(title: string, content: string) {
  const id = `upload-${checksum(content).slice(0, 12)}`
  const existing = uploadedDocs.find((d) => d.checksum === checksum(content))
  if (existing) return existing
  const { doc, chunks } = load(id, title, content, ['col-hr'])
  uploadedDocs.push(doc)
  uploadedChunks.push(...chunks)
  return doc
}
