import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import type { Express } from 'express';
import { config } from '../config.js';

export function setupSecurity(app: Express) {
  // ── Helmet (CSP, X-Frame-Options, HSTS etc.) ──────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      // ─ COOP: ต้องใช้ same-origin-allow-popups เพื่อให้ Google OAuth popup
      //   สามารถส่ง credential กลับมาหาหน้าหลักผ่าน window.postMessage ได้
      //   (ถ้าใช้ same-origin จะโดน block ทำให้ login ด้วย Google ไม่ได้)
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      frameguard: { action: 'deny' },
      hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
    }),
  );

  // ── CORS (whitelist only) ─────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.app.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
    }),
  );

  // ── Global rate limit ─────────────────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1_000, // 15 min
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests — please try again later.' },
    }),
  );

  // ── Auth-specific stricter rate limit ─────────────────────────────────────
  app.use(
    '/auth',
    rateLimit({
      windowMs: 15 * 60 * 1_000,
      max: 20,
      message: { error: 'Too many auth attempts.' },
    }),
  );

  app.set('trust proxy', 1);
}
