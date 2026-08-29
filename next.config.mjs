/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output causes ENOENT with Vercel's NFT tracer; only use in Docker/custom server
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig


