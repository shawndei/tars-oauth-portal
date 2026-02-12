/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false, // Disable SWC minify to avoid binary issues on this platform
  // Note: API routes handle proxying instead of rewrites
}

module.exports = nextConfig
