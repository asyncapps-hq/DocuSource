import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@docusource/shared', '@docusource/chunker', '@docusource/retriever'],
}

export default nextConfig
