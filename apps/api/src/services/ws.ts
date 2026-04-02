import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { redisSub, TASK_PUBSUB_CHANNEL } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';

interface AuthenticatedWS extends WebSocket {
  userId?: string;
  isAlive: boolean;
}

let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  // ── Subscribe to Redis pub/sub channel ─────────────────────────────────────
  redisSub.subscribe(TASK_PUBSUB_CHANNEL, (err) => {
    if (err) {
      logger.error({ err }, 'Redis subscribe error');
    } else {
      logger.info(`Subscribed to Redis channel: ${TASK_PUBSUB_CHANNEL}`);
    }
  });

  redisSub.on('message', (_channel: string, message: string) => {
    // Broadcast to all authenticated clients
    broadcastToAll(message);
  });

  // ── WebSocket connection handler ───────────────────────────────────────────
  wss.on('connection', (ws: AuthenticatedWS, req) => {
    ws.isAlive = true;

    // Extract token from query string: ws://server/ws?token=<jwt>
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (token) {
      try {
        const payload = jwt.verify(token, config.jwt.accessSecret) as { sub: string };
        ws.userId = payload.sub;
        logger.debug({ userId: ws.userId }, 'WS client authenticated');
      } catch {
        logger.warn('WS client sent invalid token — connected as anonymous');
      }
    }

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('close', () => {
      logger.debug({ userId: ws.userId }, 'WS client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ err, userId: ws.userId }, 'WS error');
    });

    // Send a welcome ping
    ws.send(JSON.stringify({ type: 'CONNECTED', userId: ws.userId ?? null }));
  });

  // ── Heartbeat to detect stale connections ─────────────────────────────────
  const heartbeat = setInterval(() => {
    wss.clients.forEach((client) => {
      const ws = client as AuthenticatedWS;
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeat));

  logger.info('WebSocket server ready at /ws');
}

function broadcastToAll(message: string) {
  if (!wss) return;
  let count = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      count++;
    }
  });
  logger.debug({ count }, 'Broadcast sent to WS clients');
}
