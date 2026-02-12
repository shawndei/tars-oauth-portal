/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy backend requests through Vercel to bypass CORS issues
  rewrites: {
    beforeFiles: [
      // Proxy health check to backend
      {
        source: '/health',
        destination: 'https://tars-oauth-api.railway.app/health'
      },
      // Proxy auth endpoints
      {
        source: '/auth/:path*',
        destination: 'https://tars-oauth-api.railway.app/auth/:path*'
      },
      // Proxy API endpoints
      {
        source: '/api/:path*',
        destination: 'https://tars-oauth-api.railway.app/api/:path*'
      }
    ]
  }
}

module.exports = nextConfig
