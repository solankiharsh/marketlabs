import { Hono } from 'hono';
import { generatePartnerSignals, getRecentSignals } from '../services/partner-signal.service';

const partnerSignals = new Hono();

// GET /api/partner-signals - Get Telegram-ready signals
partnerSignals.get('/', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    const signals = await getRecentSignals(limit);

    return c.json({
      success: true,
      data: signals,
    });
  } catch (error) {
    console.error('[PartnerSignalsRoutes] Error fetching signals:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch signals',
        },
      },
      500
    );
  }
});

// POST /api/partner-signals/generate - Generate new signals
partnerSignals.post('/generate', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '5');
    const signals = await generatePartnerSignals(limit);

    return c.json({
      success: true,
      data: {
        generated: signals.length,
        signals,
      },
    });
  } catch (error) {
    console.error('[PartnerSignalsRoutes] Error generating signals:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate signals',
        },
      },
      500
    );
  }
});

export { partnerSignals };

