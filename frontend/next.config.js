/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
    NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x1afd0Ec4340845c8E317F7B56489d08A48bAB2E4',
  },
}

module.exports = nextConfig