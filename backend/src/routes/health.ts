import { Hono } from 'hono';
import { checkDbConnection } from '../lib/db';

const health = new Hono();

health.get('/', async (c) => {
  const dbConnected = await checkDbConnection();
  
  return c.json({
    status: dbConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbConnected ? 'connected' : 'disconnected',
    },
  });
});

export { health };

