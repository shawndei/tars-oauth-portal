/** @type {import('next').NextConfig} */
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tars-oauth-api.railway.app';

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BACKEND_URL: backendUrl
  },
  // Proxy backend requests through Vercel to bypass CORS issues
  async rewrites() {
    return {
      beforeFiles: [
        // Proxy health check and all backend API calls
        {
          source: '/health',
          destination: `${backendUrl}/health`
        },
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`
        },
        {
          source: '/auth/:path*',
          destination: `${backendUrl}/auth/:path*`
        },
        {
          source: '/accounts/:path*',
          destination: `${backendUrl}/accounts/:path*`
        },
        {
          source: '/tokens/:path*',
          destination: `${backendUrl}/tokens/:path*`
        }
      ]
    };
  }
}

module.exports = nextConfig
