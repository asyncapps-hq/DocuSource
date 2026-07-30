import { ChatWorkspace } from '@/components/ChatWorkspace'
import { DEMO_QUESTION } from '@/lib/demo-corpus'

export default function DemoPage() {
  return (
    <div>
      <h1 style={{ marginTop: 0, fontFamily: 'var(--font-display)' }}>Live demo</h1>
      <p className="muted">Seeded policies · no Supabase or LLM required · try the hardware budget question.</p>
      <ChatWorkspace initialQuestion={DEMO_QUESTION} autoAsk />
    </div>
  )
}
