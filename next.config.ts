import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* 允许外部访问（用于移动端测试） */
  experimental: {
    externalDir: true,
  },
  // Turbopack配置
  turbopack: {},

  /* 构建输出配置 */
  output: 'standalone',
  
  /* 外部包配置 */
  serverExternalPackages: [],
  
  /* 环境变量配置 */
  env: {
    NEXT_PUBLIC_API_URL: process.env.NODE_ENV === 'development' 
      ? '/api/proxy'  // 开发环境使用代理
      : process.env.NEXT_PUBLIC_API_URL || '/api/proxy',
  },
  
  /* 图片配置 */
  images: {
    domains: ['localhost', '172.16.10.105'],
  },
  
  /* 跨域配置 */
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-token' },
        ]
      }
    ]
  },
  
  /* 禁用 Vercel 相关功能 */
  poweredByHeader: false,
  generateEtags: false,
  
  /* TypeScript 配置 */
  typescript: {
    ignoreBuildErrors: false,
  },
  
  /* ESLint 配置 */
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig