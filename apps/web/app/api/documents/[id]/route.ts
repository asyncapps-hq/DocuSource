import { NextResponse } from 'next/server'
import { allDocuments } from '@/lib/demo-corpus'

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const doc = allDocuments().find((d) => d.id === id)
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ document: doc })
}
