/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use standalone output when explicitly requested and not on Vercel
  ...(process.env.BUILD_STANDALONE === 'true' && !process.env.VERCEL
    ? { output: 'standalone' }
    : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig

