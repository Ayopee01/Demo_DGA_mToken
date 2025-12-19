import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ✅ สำคัญ: ให้ next build สร้าง .next/standalone
  output: 'standalone',

  async rewrites() {
    return [
      { source: '/test2/api/dga', destination: '/api/dga' },
      { source: '/test2/auth/login', destination: '/api/dga?op=login' },
      { source: '/test2/notify/send', destination: '/api/dga?op=notify' },
    ]
  },
}

export default nextConfig
