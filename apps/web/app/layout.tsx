import type { Metadata } from 'next'
import './globals.css'
import { MotionProvider } from '@/lib/motion/provider'

export const metadata: Metadata = {
  title: 'DocuSource — Enterprise Knowledge RAG',
  description: 'Grounded policy answers with exact citation highlights.',
  authors: [{ name: 'KhyFee', url: 'https://github.com/KhyFee' }],
  creator: 'KhyFee',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-motion="on">
      <body>
        <MotionProvider>
          {children}
          <footer className="credit">
            DocuSource by <a href="https://github.com/KhyFee">KhyFee</a>
          </footer>
        </MotionProvider>
      </body>
    </html>
  )
}
