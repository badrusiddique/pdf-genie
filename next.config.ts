import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack config for `next dev` (Next.js 16 default)
  // WASM is supported natively - no extra config needed
  // `root` fixes the workspace root warning when other lockfiles exist nearby
  turbopack: {
    root: __dirname,
    resolveAlias: {
      // pdfjs-dist references canvas for server-side rendering - not needed in browser
      canvas: './src/empty-module.js',
    },
  },
  // Webpack config for `next build` (still uses webpack by default)
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true }
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }
    return config
  },
}

export default nextConfig
