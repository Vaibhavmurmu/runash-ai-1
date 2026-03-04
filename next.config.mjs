/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
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
