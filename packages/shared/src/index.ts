import { z } from 'zod'

export const CitationSchema = z.object({
  documentId: z.string(),
  chunkId: z.string(),
  title: z.string(),
  quote: z.string().min(1),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  score: z.number(),
  headingPath: z.string().optional(),
})
export type Citation = z.infer<typeof CitationSchema>

export const ChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  ordinal: z.number().int(),
  content: z.string(),
  startOffset: z.number().int(),
  endOffset: z.number().int(),
  headingPath: z.string().default(''),
  embedding: z.array(z.number()).optional(),
  tableDense: z.boolean().optional(),
})
export type Chunk = z.infer<typeof ChunkSchema>

export const DocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  mime: z.string(),
  status: z.enum(['pending', 'processing', 'ready', 'failed']),
  content: z.string(),
  checksum: z.string(),
  parseWarnings: z.array(z.string()).default([]),
  version: z.number().int().default(1),
  collectionIds: z.array(z.string()).default([]),
})
export type Document = z.infer<typeof DocumentSchema>

export const GroundedAnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema),
  refused: z.boolean(),
  refusalReason: z.string().optional(),
  mode: z.enum(['extractive', 'llm', 'demo']),
  followUps: z.array(z.string()).default([]),
  retrieval: z
    .object({
      mode: z.enum(['dense', 'sparse', 'hybrid']),
      hitCount: z.number(),
      bestScore: z.number(),
    })
    .optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
})
export type GroundedAnswer = z.infer<typeof GroundedAnswerSchema>

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  citations: z.array(CitationSchema).optional(),
  createdAt: z.string().optional(),
})
export type ChatMessage = z.infer<typeof ChatMessageSchema>

export const EvalCaseSchema = z.object({
  id: z.string(),
  question: z.string(),
  mustCiteContains: z.array(z.string()),
  mustRefuse: z.boolean(),
})
export type EvalCase = z.infer<typeof EvalCaseSchema>

export const EMBEDDING_DIM = 384
export const PRODUCT = 'DocuSource by KhyFee'
