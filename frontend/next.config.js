/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000",
    NEXT_PUBLIC_CONTRACT_ADDRESS:
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
      "0xA9852D119cCDf5Ff0c3C6b450bA129B8b5219B30",
  },
};

module.exports = nextConfig;
