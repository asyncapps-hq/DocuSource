'use client'

import { useEffect, useRef } from 'react'
import { useMotion } from '@/lib/motion/provider'

export function DocumentViewer({
  content,
  start,
  end,
}: {
  content: string
  start?: number
  end?: number
}) {
  const ref = useRef<HTMLPreElement>(null)
  const { enabled } = useMotion()
  const hasRange = typeof start === 'number' && typeof end === 'number' && end > start
  const before = hasRange ? content.slice(0, start) : content
  const mid = hasRange ? content.slice(start, end) : ''
  const after = hasRange ? content.slice(end) : ''

  useEffect(() => {
    const el = ref.current?.querySelector('.cite-hit')
    el?.scrollIntoView({ behavior: enabled ? 'smooth' : 'auto', block: 'center' })
    if (!enabled || !el) return
    void import('animejs').then((mod) => {
      const animate = (mod as { animate?: Function }).animate || (mod as { default?: Function }).default
      if (typeof animate === 'function') {
        animate({
          targets: el,
          opacity: [0.35, 1],
          duration: 450,
          easing: 'easeOutQuad',
        })
      }
    })
  }, [start, end, enabled, content])

  return (
    <pre
      ref={ref}
      className="panel"
      style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '70vh', margin: 0 }}
      data-testid="document-viewer"
    >
      {hasRange ? (
        <>
          {before}
          <mark className="cite-hit" data-testid="citation-highlight">
            {mid}
          </mark>
          {after}
        </>
      ) : (
        content
      )}
    </pre>
  )
}
