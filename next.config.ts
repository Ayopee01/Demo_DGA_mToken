/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // ให้ /test2/api/dga วิ่งเข้า route จริง /api/dga
      { source: '/test2/api/dga', destination: '/api/dga' },

      // (ถ้าคุณอยากให้เหมือน test5 ตัวอย่างเดิม)
      // /test2/auth/login  -> /api/dga?op=login
      { source: '/test2/auth/login', destination: '/api/dga?op=login' },

      // /test2/notify/send -> /api/dga?op=notify
      { source: '/test2/notify/send', destination: '/api/dga?op=notify' },
    ]
  },
}

module.exports = nextConfig
