import { Hono } from 'hono';
import { getMarketScannerService } from '../services/market-scanner.service';
import { getDerivDataService } from '../services/deriv-data.service';
import { getVitalityStatsService } from '../services/vitality-stats.service';
import { getTimeframeAnalysisService } from '../services/timeframe-analysis.service';
import { getStructuralAnalysisService } from '../services/structural-analysis.service';
import { getRegimeAnalysisService } from '../services/regime-analysis.service';
import { getNewsService } from '../services/news.service';
import { getDecisionInquiryService } from '../services/decision-inquiry.service';
import { getJobQueueService } from '../services/job-queue.service';
import { getScanJobService } from '../services/scan-job.service';
import { db } from '../lib/db';

const market = new Hono();

// GET /api/market/assets - List all tracked assets
market.get('/assets', async (c) => {
  try {
    const assets = await db.marketAsset.findMany({
      where: { active: true },
      orderBy: { displayName: 'asc' },
    });

    return c.json({
      success: true,
      data: assets,
    });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching assets:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch assets',
        },
      },
      500
    );
  }
});

// GET /api/market/scans - Latest scans with rankings
market.get('/scans', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '25');
    const scanner = getMarketScannerService();
    const scans = await scanner.getLatestScans(limit);

    return c.json({
      success: true,
      data: scans,
    });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching scans:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch scans',
        },
      },
      500
    );
  }
});

// GET /api/market/rankings - Top-ranked setups (with Acumen confidence data)
market.get('/rankings', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '25');
    const scanner = getMarketScannerService();
    const scans = await scanner.getLatestScans(limit);
    
    // If we have fewer scans than expected, ensure we're tracking all base assets
    if (scans.length < 4) {
      console.log(`[MarketRoutes] Only ${scans.length} scans found, checking tracked assets...`);
      // This will be handled by the scanner scheduler, but we can log it
    }

    // Enrich scans with pattern counts and S/R level info
    const enrichedScans = await Promise.all(
      scans.map(async (scan) => {
        try {
          const patternCount = await db.detectedPattern.count({
            where: { scanId: scan.id },
          });
          const srCount = await db.supportResistanceLevel.count({
            where: { scanId: scan.id },
          });
          const hasAI = await db.aiAnalysis.findFirst({
            where: { scanId: scan.id },
          });

          // Convert Prisma Decimal types to numbers for JSON serialization
          const toNumber = (value: any): number | null => {
            if (value === null || value === undefined) return null;
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
              const num = parseFloat(value);
              return isNaN(num) ? null : num;
            }
            if (typeof value === 'object' && 'toString' in value) {
              const num = parseFloat(value.toString());
              return isNaN(num) ? null : num;
            }
            return null;
          };

          return {
            ...scan,
            price: toNumber(scan.price),
            change24h: toNumber(scan.change24h),
            volume24h: toNumber(scan.volume24h),
            rsi: toNumber(scan.rsi),
            macd: toNumber(scan.macd),
            macdSignal: toNumber(scan.macdSignal),
            sma20: toNumber(scan.sma20),
            ema50: toNumber(scan.ema50),
            bbUpper: toNumber(scan.bbUpper),
            bbLower: toNumber(scan.bbLower),
            adx: toNumber(scan.adx),
            atr: toNumber(scan.atr),
            score: toNumber(scan.score),
            momentum: toNumber(scan.momentum),
            patternConfidence: toNumber(scan.patternConfidence),
            volumeConfidence: toNumber(scan.volumeConfidence),
            trendConfidence: toNumber(scan.trendConfidence),
            indicatorConfidence: toNumber(scan.indicatorConfidence),
            overallConfidence: toNumber(scan.overallConfidence),
            patternCount,
            hasSRLevels: srCount > 0,
            hasAIAnalysis: !!hasAI,
          };
        } catch (err: any) {
          console.error(`[MarketRoutes] Error enriching scan ${scan.id}:`, err.message);
          // Return scan without enrichment if enrichment fails
          return scan;
        }
      })
    );

    return c.json({
      success: true,
      data: enrichedScans,
    });
  } catch (error: any) {
    console.error('[MarketRoutes] Error fetching rankings:', error);
    console.error('[MarketRoutes] Error stack:', error.stack);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch rankings',
        },
      },
      500
    );
  }
});

// GET /api/market/asset/:symbol - Asset details with full analysis
market.get('/asset/:symbol', async (c) => {
  try {
    const symbol = c.req.param('symbol');

    const asset = await db.marketAsset.findUnique({
      where: { symbol },
      include: {
        scans: {
          take: 10,
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!asset) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Asset not found',
          },
        },
        404
      );
    }

    // Get latest scan
    const latestScan = asset.scans[0] || null;

    // Convert Decimal types to numbers and add asset info
    const toNumber = (value: any): number | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      }
      if (typeof value === 'object' && 'toString' in value) {
        const num = parseFloat(value.toString());
        return isNaN(num) ? null : num;
      }
      return null;
    };

    const latestScanWithAsset = latestScan ? {
      ...latestScan,
      asset: {
        id: asset.id,
        symbol: asset.symbol,
        displayName: asset.displayName,
        category: asset.category,
      },
      price: toNumber(latestScan.price),
      change24h: toNumber(latestScan.change24h),
      volume24h: toNumber(latestScan.volume24h),
      rsi: toNumber(latestScan.rsi),
      macd: toNumber(latestScan.macd),
      macdSignal: toNumber(latestScan.macdSignal),
      sma20: toNumber(latestScan.sma20),
      ema50: toNumber(latestScan.ema50),
      bbUpper: toNumber(latestScan.bbUpper),
      bbLower: toNumber(latestScan.bbLower),
      adx: toNumber(latestScan.adx),
      atr: toNumber(latestScan.atr),
      score: toNumber(latestScan.score),
      momentum: toNumber(latestScan.momentum),
      patternConfidence: toNumber(latestScan.patternConfidence),
      volumeConfidence: toNumber(latestScan.volumeConfidence),
      trendConfidence: toNumber(latestScan.trendConfidence),
      indicatorConfidence: toNumber(latestScan.indicatorConfidence),
      overallConfidence: toNumber(latestScan.overallConfidence),
    } : null;

    // Fetch current price
    const derivService = getDerivDataService();
    const priceData = await derivService.getPrice(symbol);

    return c.json({
      success: true,
      data: {
        asset,
        latestScan: latestScanWithAsset,
        currentPrice: priceData,
      },
    });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching asset:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch asset details',
        },
      },
      500
    );
  }
});

// POST /api/market/scan - Trigger async scan (returns job ID immediately)
market.post('/scan', async (c) => {
  try {
    const query = c.req.query();
    const sync = query.sync === 'true'; // Allow sync mode for backward compatibility

    if (sync) {
      // Synchronous mode (backward compatibility, with longer timeout)
      const scanner = getMarketScannerService();
      const results = await scanner.scanAllAssets();

      return c.json({
        success: true,
        data: {
          scanned: results.length,
          results,
        },
      });
    }

    // Async mode (default) - return job ID immediately
    const jobQueue = getJobQueueService();
    const scanJobService = getScanJobService();
    const jobId = await jobQueue.createJob();

    // Start processing in background
    scanJobService.startJobAsync(jobId);

    return c.json(
      {
        success: true,
        message: 'Scan job started',
        data: {
          jobId,
        },
      },
      202 // Accepted
    );
  } catch (error) {
    console.error('[MarketRoutes] Error triggering scan:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to trigger scan',
        },
      },
      500
    );
  }
});

// GET /api/market/scan/:jobId - Poll for scan job status
market.get('/scan/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const jobQueue = getJobQueueService();
    const jobStatus = await jobQueue.getJobStatus(jobId);

    if (!jobStatus) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found',
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: jobStatus,
    });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching job status:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch job status',
        },
      },
      500
    );
  }
});

// GET /api/market/asset/:symbol/vitality - Get vitality stats
market.get('/asset/:symbol/vitality', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const asset = await db.marketAsset.findUnique({ where: { symbol } });

    if (!asset) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } }, 404);
    }

    const vitalityService = getVitalityStatsService();
    const stats = await vitalityService.getOrCalculateVitalityStats(asset.id, symbol);

    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching vitality stats:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch vitality stats' } }, 500);
  }
});

// GET /api/market/asset/:symbol/timeframes - Get multi-timeframe analysis
market.get('/asset/:symbol/timeframes', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const asset = await db.marketAsset.findUnique({ where: { symbol } });

    if (!asset) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } }, 404);
    }

    const latestScan = await db.marketScan.findFirst({
      where: { assetId: asset.id },
      orderBy: { timestamp: 'desc' },
    });

    if (!latestScan) {
      return c.json({ success: false, error: { code: 'NO_DATA', message: 'No scan data available' } }, 404);
    }

    const timeframeService = getTimeframeAnalysisService();
    const analyses = await timeframeService.getOrGenerateTimeframeAnalysis(asset.id, symbol, latestScan.id);

    return c.json({ success: true, data: analyses });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching timeframe analysis:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch timeframe analysis' } }, 500);
  }
});

// GET /api/market/asset/:symbol/structural - Get structural analysis
market.get('/asset/:symbol/structural', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const asset = await db.marketAsset.findUnique({ where: { symbol } });

    if (!asset) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } }, 404);
    }

    const latestScan = await db.marketScan.findFirst({
      where: { assetId: asset.id },
      orderBy: { timestamp: 'desc' },
    });

    if (!latestScan) {
      return c.json({ success: false, error: { code: 'NO_DATA', message: 'No scan data available' } }, 404);
    }

    const structuralService = getStructuralAnalysisService();
    const analysis = await structuralService.getOrGenerateStructuralAnalysis(asset.id, latestScan.id, {
      price: Number(latestScan.price),
      rsi: latestScan.rsi ? Number(latestScan.rsi) : undefined,
      macd: latestScan.macd ? Number(latestScan.macd) : undefined,
      macdSignal: latestScan.macdSignal ? Number(latestScan.macdSignal) : undefined,
      sma20: latestScan.sma20 ? Number(latestScan.sma20) : undefined,
      ema50: latestScan.ema50 ? Number(latestScan.ema50) : undefined,
      bbUpper: latestScan.bbUpper ? Number(latestScan.bbUpper) : undefined,
      bbLower: latestScan.bbLower ? Number(latestScan.bbLower) : undefined,
      adx: latestScan.adx ? Number(latestScan.adx) : undefined,
      atr: latestScan.atr ? Number(latestScan.atr) : undefined,
      score: Number(latestScan.score),
      setupType: latestScan.setupType as any,
      momentum: latestScan.momentum ? Number(latestScan.momentum) : undefined,
    });

    return c.json({ success: true, data: analysis });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching structural analysis:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch structural analysis' } }, 500);
  }
});

// GET /api/market/asset/:symbol/inquiries - Get decision inquiries
market.get('/asset/:symbol/inquiries', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const asset = await db.marketAsset.findUnique({ where: { symbol } });

    if (!asset) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } }, 404);
    }

    const latestScan = await db.marketScan.findFirst({
      where: { assetId: asset.id },
      orderBy: { timestamp: 'desc' },
    });

    if (!latestScan) {
      return c.json({ success: false, error: { code: 'NO_DATA', message: 'No scan data available' } }, 404);
    }

    // Get structural analysis for context
    const structuralService = getStructuralAnalysisService();
    let structuralData = null;
    try {
      structuralData = await structuralService.getOrGenerateStructuralAnalysis(asset.id, latestScan.id, {
        price: Number(latestScan.price),
        rsi: latestScan.rsi ? Number(latestScan.rsi) : undefined,
        macd: latestScan.macd ? Number(latestScan.macd) : undefined,
        macdSignal: latestScan.macdSignal ? Number(latestScan.macdSignal) : undefined,
        sma20: latestScan.sma20 ? Number(latestScan.sma20) : undefined,
        ema50: latestScan.ema50 ? Number(latestScan.ema50) : undefined,
        bbUpper: latestScan.bbUpper ? Number(latestScan.bbUpper) : undefined,
        bbLower: latestScan.bbLower ? Number(latestScan.bbLower) : undefined,
        adx: latestScan.adx ? Number(latestScan.adx) : undefined,
        atr: latestScan.atr ? Number(latestScan.atr) : undefined,
        score: Number(latestScan.score),
        setupType: latestScan.setupType as any,
        momentum: latestScan.momentum ? Number(latestScan.momentum) : undefined,
      });
    } catch (e) {
      // Continue without structural data
    }

    const inquiryService = getDecisionInquiryService();
    const inquiries = await inquiryService.getOrGenerateDecisionInquiries(
      asset.id,
      symbol,
      {
        price: Number(latestScan.price),
        rsi: latestScan.rsi ? Number(latestScan.rsi) : undefined,
        macd: latestScan.macd ? Number(latestScan.macd) : undefined,
        change24h: latestScan.change24h ? Number(latestScan.change24h) : undefined,
        score: Number(latestScan.score),
        setupType: latestScan.setupType as any,
        momentum: latestScan.momentum ? Number(latestScan.momentum) : undefined,
      },
      structuralData ? {
        primaryDriver: structuralData.primaryDriver,
        structuralImpact: structuralData.structuralImpact,
      } : undefined
    );

    return c.json({ success: true, data: inquiries });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching decision inquiries:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch decision inquiries' } }, 500);
  }
});

// GET /api/market/asset/:symbol/regimes - Get regime analogies
market.get('/asset/:symbol/regimes', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const asset = await db.marketAsset.findUnique({ where: { symbol } });

    if (!asset) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } }, 404);
    }

    const regimeService = getRegimeAnalysisService();
    const analogies = await regimeService.getRegimeAnalogies(asset.id, 5);

    return c.json({ success: true, data: analogies });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching regime analogies:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch regime analogies' } }, 500);
  }
});

// GET /api/market/asset/:symbol/news - Get news feed (with optional refresh and filtering)
market.get('/asset/:symbol/news', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const limit = parseInt(c.req.query('limit') || '10');
    const refresh = c.req.query('refresh') === 'true';
    const sentiment = c.req.query('sentiment') as 'bullish' | 'bearish' | 'neutral' | 'mixed' | undefined;
    const hours = c.req.query('hours') ? parseInt(c.req.query('hours')!) : undefined;

    const newsService = getNewsService();
    
    // If refresh requested, aggregate news from external sources in background
    if (refresh) {
      newsService.aggregateNews(symbol).catch((error) => {
        console.error(`[MarketRoutes] Background news aggregation error for ${symbol}:`, error);
      });
    }
    
    // Return existing news from database with filters
    const articles = await newsService.getNewsBySymbol(symbol, limit, sentiment, hours);
    return c.json({ success: true, data: articles });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching news:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch news' } }, 500);
  }
});

// GET /api/market/asset/:symbol/patterns - Get detected patterns
market.get('/asset/:symbol/patterns', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const asset = await db.marketAsset.findUnique({ where: { symbol } });

    if (!asset) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } }, 404);
    }

    const latestScan = await db.marketScan.findFirst({
      where: { assetId: asset.id },
      orderBy: { timestamp: 'desc' },
    });

    if (!latestScan) {
      return c.json({ success: false, error: { code: 'NO_DATA', message: 'No scan data available' } }, 404);
    }

    const patterns = await db.detectedPattern.findMany({
      where: { scanId: latestScan.id },
      orderBy: { confidence: 'desc' },
    });

    return c.json({ success: true, data: patterns });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching patterns:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch patterns' } }, 500);
  }
});

// GET /api/market/asset/:symbol/support-resistance - Get S/R levels
market.get('/asset/:symbol/support-resistance', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const asset = await db.marketAsset.findUnique({ where: { symbol } });

    if (!asset) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } }, 404);
    }

    const latestScan = await db.marketScan.findFirst({
      where: { assetId: asset.id },
      orderBy: { timestamp: 'desc' },
    });

    if (!latestScan) {
      return c.json({ success: false, error: { code: 'NO_DATA', message: 'No scan data available' } }, 404);
    }

    const levels = await db.supportResistanceLevel.findMany({
      where: { scanId: latestScan.id },
      orderBy: { proximity: 'asc' },
    });

    return c.json({ success: true, data: levels });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching S/R levels:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch S/R levels' } }, 500);
  }
});

// GET /api/market/asset/:symbol/ai-analysis - Get AI analysis
market.get('/asset/:symbol/ai-analysis', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const analysisType = c.req.query('type') as 'pattern_review' | 'comprehensive' | undefined;
    const asset = await db.marketAsset.findUnique({ where: { symbol } });

    if (!asset) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } }, 404);
    }

    const latestScan = await db.marketScan.findFirst({
      where: { assetId: asset.id },
      orderBy: { timestamp: 'desc' },
    });

    if (!latestScan) {
      return c.json({ success: false, error: { code: 'NO_DATA', message: 'No scan data available' } }, 404);
    }

    const aiService = (await import('../services/ai-analysis.service')).getAIAnalysisService();
    const analysis = await aiService.getAnalysis(latestScan.id, analysisType);

    if (!analysis) {
      return c.json({ success: false, error: { code: 'NO_DATA', message: 'No AI analysis available' } }, 404);
    }

    return c.json({ success: true, data: analysis });
  } catch (error) {
    console.error('[MarketRoutes] Error fetching AI analysis:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch AI analysis' } }, 500);
  }
});

// POST /api/market/asset/:symbol/analyze - Trigger full analysis generation
market.post('/asset/:symbol/analyze', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const asset = await db.marketAsset.findUnique({ where: { symbol } });

    if (!asset) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } }, 404);
    }

    const latestScan = await db.marketScan.findFirst({
      where: { assetId: asset.id },
      orderBy: { timestamp: 'desc' },
    });

    if (!latestScan) {
      return c.json({ success: false, error: { code: 'NO_DATA', message: 'No scan data available' } }, 404);
    }

    // Generate structural analysis first (needed for decision inquiries)
    const structuralAnalysis = await getStructuralAnalysisService().getOrGenerateStructuralAnalysis(asset.id, latestScan.id, {
      price: Number(latestScan.price),
      rsi: latestScan.rsi ? Number(latestScan.rsi) : undefined,
      macd: latestScan.macd ? Number(latestScan.macd) : undefined,
      macdSignal: latestScan.macdSignal ? Number(latestScan.macdSignal) : undefined,
      sma20: latestScan.sma20 ? Number(latestScan.sma20) : undefined,
      ema50: latestScan.ema50 ? Number(latestScan.ema50) : undefined,
      bbUpper: latestScan.bbUpper ? Number(latestScan.bbUpper) : undefined,
      bbLower: latestScan.bbLower ? Number(latestScan.bbLower) : undefined,
      adx: latestScan.adx ? Number(latestScan.adx) : undefined,
      atr: latestScan.atr ? Number(latestScan.atr) : undefined,
      score: Number(latestScan.score),
      setupType: latestScan.setupType as any,
      momentum: latestScan.momentum ? Number(latestScan.momentum) : undefined,
    });

    // Generate all analyses in parallel
    const [vitalityStats, timeframeAnalyses, regimeAnalogies, decisionInquiries, newsArticles] = await Promise.all([
      getVitalityStatsService().getOrCalculateVitalityStats(asset.id, symbol),
      getTimeframeAnalysisService().getOrGenerateTimeframeAnalysis(asset.id, symbol, latestScan.id),
      getRegimeAnalysisService().getOrGenerateRegimeAnalogies(asset.id, symbol, {
        price: Number(latestScan.price),
        rsi: latestScan.rsi ? Number(latestScan.rsi) : undefined,
        macd: latestScan.macd ? Number(latestScan.macd) : undefined,
        change24h: latestScan.change24h ? Number(latestScan.change24h) : undefined,
        score: Number(latestScan.score),
        setupType: latestScan.setupType as any,
      }),
      getDecisionInquiryService().getOrGenerateDecisionInquiries(
        asset.id,
        symbol,
        {
          price: Number(latestScan.price),
          rsi: latestScan.rsi ? Number(latestScan.rsi) : undefined,
          macd: latestScan.macd ? Number(latestScan.macd) : undefined,
          change24h: latestScan.change24h ? Number(latestScan.change24h) : undefined,
          score: Number(latestScan.score),
          setupType: latestScan.setupType as any,
          momentum: latestScan.momentum ? Number(latestScan.momentum) : undefined,
        },
        structuralAnalysis ? {
          primaryDriver: structuralAnalysis.primaryDriver,
          structuralImpact: structuralAnalysis.structuralImpact,
        } : undefined
      ),
      getNewsService().aggregateNews(symbol),
    ]);

    return c.json({
      success: true,
      message: 'Full analysis generated successfully',
      data: {
        vitalityStats,
        timeframeAnalyses,
        structuralAnalysis,
        regimeAnalogies,
        decisionInquiries,
        newsArticles: newsArticles.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('[MarketRoutes] Error generating full analysis:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate analysis' } }, 500);
  }
});

// GET /api/market/asset/:symbol/ohlcv - Get OHLCV data for chart
market.get('/asset/:symbol/ohlcv', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const count = parseInt(c.req.query('count') || '100');
    const granularity = parseInt(c.req.query('granularity') || '60'); // Default 1-minute candles

    const derivService = getDerivDataService();
    const ohlcv = await derivService.getOHLCV(symbol, count, granularity);

    return c.json({
      success: true,
      data: ohlcv,
    });
  } catch (error: any) {
    console.error('[MarketRoutes] Error fetching OHLCV:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch OHLCV data',
        },
      },
      500
    );
  }
});

export { market };

