export const config = {
  api: {
    url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
  ws: {
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000',
  },
  google: {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '654672509087-q10j2d28p55m48c9ipkgfndcsdddld1h.apps.googleusercontent.com',
  }
};
