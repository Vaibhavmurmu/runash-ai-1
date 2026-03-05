/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack (default in v16) - removed webpack explicit config
  // For migration help, see: https://nextjs.org/docs/app/api-reference/next-config-js
  
  // TypeScript strictness - enable after migration fixes
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint - migrate to ESLint CLI (recommended in v16)
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Image optimization updates for v16
  images: {
    unoptimized: true, // Keep for dev compatibility
    minimumCacheTTL: 14400, // 4 hours (new default)
    imageSizes: [32, 48, 64, 96, 128, 256, 384], // Removed 16
    qualities: [75], // Simplified quality options
    dangerouslyAllowLocalIP: false,
    maximumRedirects: 3,
  },

  // Existing redirects (maintained from v15)
  async redirects() {
    return [
      {
        source: "/ai",
        destination: "/ai-research-lab",
        permanent: true,
      },
      {
        source: "/models",
        destination: "/research-overview",
        permanent: true,
      },
      {
        source: "/live",
        destination: "/space",
        permanent: true,
      },
      {
        source: "/pro",
        destination: "/enterprises",
        permanent: true,
      },
      {
        source: "/payment/business",
        destination: "/enterprises",
        permanent: true,
      },
      {
        source: "/payment/startup",
        destination: "/partner",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
