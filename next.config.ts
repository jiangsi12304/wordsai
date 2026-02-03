import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // 为移动应用优化
  poweredByHeader: false,
  compress: true,
  // 环境变量
  env: {
    NEXT_PUBLIC_APP_MODE: 'capacitor',
  },
  // 输出配置
  output: 'standalone',
  // 图片优化
  images: {
    unoptimized: true, // Capacitor 需要
  },
  // 头部配置
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
