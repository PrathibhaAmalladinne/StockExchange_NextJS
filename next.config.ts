import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    VERCEL_URL: process.env.VERCEL_URL,
  },
}

export default nextConfig
