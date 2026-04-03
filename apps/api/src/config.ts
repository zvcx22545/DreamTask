export const config = {
  app: {
    env: 'development', // 'development' | 'production'
    port: 4000,
    allowedOrigins: ['http://localhost:8000'],
    url: process.env.FRONTEND_URL || 'http://localhost:8000',
  },
  db: {
    // รูปแบบ: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
    url: process.env.DATABASE_URL || 'postgresql://zvcx22545:0989904873Hd@127.0.0.1:5433/dreamnotion',
  },
  redis: {
    // รูปแบบ: redis://:PASSWORD@HOST:PORT
    url: process.env.REDIS_URL || 'redis://:0989904873Hd@127.0.0.1:6379',
  },
  jwt: {
    accessSecret: 'change-me-access-very-long-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'e4a2c0f8d6b4e2a0c8f6d4b2e0a8c6f4d2b0e8c6a4f2d0b8e6c4a2f0d8b6e4',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '654672509087-q10j2d28p55m48c9ipkgfndcsdddld1h.apps.googleusercontent.com',
  },
  melli:{
    MEILI_URL: process.env.MEILI_URL || 'http://localhost:7700',
    MEILI_MASTER_KEY: process.env.MEILI_MASTER_KEY || 'masterKey',
  }
};
