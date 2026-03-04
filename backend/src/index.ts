// Load environment variables first
import 'dotenv/config';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { env } from './lib/env';
import { db } from './lib/db';
import './lib/privy';

// Routes
import { health } from './routes/health';
import { auth } from './routes/auth';
import { market } from './routes/market.routes';
import { partnerSignals } from './routes/partner-signals.routes';

// Services
import { createScannerScheduler } from './services/scanner-scheduler';
import { getNewsSchedulerService } from './services/news-scheduler.service';

const app = new Hono();

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://marketlabs.xyz',
  'https://www.marketlabs.xyz',
];

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Routes
app.route('/health', health);
app.route('/auth', auth);
app.route('/api/market', market);
app.route('/api/partner-signals', partnerSignals);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'MarketLabs API',
    version: '0.1.0',
    status: 'operational',
  });
});

// Start scanner scheduler (scan every 5 minutes)
const scheduler = createScannerScheduler(5);
scheduler.start();

// Start news scheduler (fetch news every 60 minutes)
const newsScheduler = getNewsSchedulerService();
newsScheduler.start(60);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  scheduler.stop();
  newsScheduler.stop();
  await db.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  scheduler.stop();
  newsScheduler.stop();
  await db.$disconnect();
  process.exit(0);
});

// Start server
const port = parseInt(env.PORT);
console.log(`[Server] Starting MarketLabs API on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`[Server] ✅ MarketLabs API running on http://localhost:${port}`);

