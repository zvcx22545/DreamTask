const WebpackBar = require('webpackbar');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.plugins.push(new WebpackBar({
      name: isServer ? 'server' : 'client',
      color: isServer ? 'orange' : 'green',
    }));
    return config;
  },
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: [],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // COOP: ต้องใช้ same-origin-allow-popups เพื่อให้ Google OAuth popup ใช้งานได้
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
              "frame-src 'self' https://accounts.google.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              `connect-src 'self' https://accounts.google.com ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'} ${(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000').replace('ws://', 'ws://').replace('wss://', 'wss://')}`,
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
