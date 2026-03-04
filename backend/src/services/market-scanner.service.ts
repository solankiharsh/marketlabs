/**
 * Market Scanner Service - Proactive scanning of 20+ Deriv assets
 */

import { db } from '../lib/db';
import { getDerivDataService, DerivSymbol, DerivPrice } from './deriv-data.service';
import { calculateAllIndicators, calculateEMA } from './indicators.service';
import { calculateSetupScore } from './setup-scorer.service';
import { getPatternDetectionService } from './pattern-detection.service';
import { getSupportResistanceService } from './support-resistance.service';
import { getConfidenceScorerService } from './confidence-scorer.service';
import { getAIAnalysisService } from './ai-analysis.service';

export interface ScanResult {
  assetId: string;
  symbol: string;
  price: number;
  change24h?: number;
  indicators: any;
  score: number;
  setupType: string;
  momentum?: number;
}

export class MarketScannerService {
  private derivService = getDerivDataService();

  /**
   * Scan a single asset
   */
  async scanAsset(asset: DerivSymbol): Promise<ScanResult | null> {
    try {
      // Get or create asset in database
      let dbAsset = await db.marketAsset.findUnique({
        where: { symbol: asset.symbol },
      });

      if (!dbAsset) {
        dbAsset = await db.marketAsset.create({
          data: {
            symbol: asset.symbol,
            displayName: asset.displayName,
            category: asset.category,
            active: true,
          },
        });
      }

      // Fetch current price
      const priceData = await this.derivService.getPrice(asset.symbol);
      if (!priceData || !priceData.quote) {
        console.warn(`[MarketScanner] No price data for ${asset.symbol}`);
        return null;
      }

      // Fetch OHLCV data for indicators - try different granularities if needed
      let ohlcv = await this.derivService.getOHLCV(asset.symbol, 100, 60); // 100 candles, 1-minute
      
      // If insufficient data, try daily candles
      if (ohlcv.length < 20) {
        console.log(`[MarketScanner] Trying daily candles for ${asset.symbol} (had ${ohlcv.length} 1-min candles)`);
        ohlcv = await this.derivService.getOHLCV(asset.symbol, 50, 86400); // 50 daily candles
      }
      
      if (ohlcv.length < 10) {
        // Very reduced threshold - allow scans with minimal data
        console.warn(`[MarketScanner] Limited OHLCV data for ${asset.symbol} (${ohlcv.length} candles) - proceeding anyway`);
      }

      // Calculate technical indicators
      const indicators = calculateAllIndicators(ohlcv);

      // Calculate 24h change (simplified - use first vs last candle)
      // Ensure we don't divide by zero
      const change24h = ohlcv.length > 0 && ohlcv[0].close > 0
        ? ((ohlcv[ohlcv.length - 1].close - ohlcv[0].close) / ohlcv[0].close) * 100
        : undefined;

      // Calculate composite score (legacy)
      const setupScore = calculateSetupScore(indicators, priceData.quote, change24h);

      // Acumen Analysis Pipeline
      // 1. Pattern Detection
      const patternService = getPatternDetectionService();
      const detectedPatterns = await patternService.detectPatterns(ohlcv);

      // 2. Support/Resistance Detection
      const srService = getSupportResistanceService();
      const srLevels = await srService.detectLevels(ohlcv, priceData.quote);

      // 3. Confidence Scoring
      const confidenceService = getConfidenceScorerService();
      // Calculate EMA-21 for trend alignment
      const closes = ohlcv.map(c => c.close);
      const ema21Array = calculateEMA(closes, 21);
      const ema21 = ema21Array && ema21Array.length > 0 ? ema21Array[ema21Array.length - 1] : undefined;

      const confidenceFactors = confidenceService.calculateConfidence({
        patterns: detectedPatterns,
        volume: undefined, // Deriv doesn't provide volume easily
        averageVolume: undefined,
        price: priceData.quote,
        ema21: ema21,
        ema50: indicators.ema50,
        rsi: indicators.rsi,
        macd: indicators.macd,
        macdSignal: indicators.macdSignal,
        macdHistogram: indicators.macdHistogram,
      });

      // Store scan in database
      const scan = await db.marketScan.create({
        data: {
          assetId: dbAsset.id,
          price: priceData.quote,
          change24h: change24h ? change24h : null,
          volume24h: null, // Deriv doesn't provide volume easily
          rsi: indicators.rsi ? indicators.rsi : null,
          macd: indicators.macd ? indicators.macd : null,
          macdSignal: indicators.macdSignal ? indicators.macdSignal : null,
          sma20: indicators.sma20 ? indicators.sma20 : null,
          ema50: indicators.ema50 ? indicators.ema50 : null,
          bbUpper: indicators.bbUpper ? indicators.bbUpper : null,
          bbLower: indicators.bbLower ? indicators.bbLower : null,
          adx: indicators.adx ? indicators.adx : null,
          atr: indicators.atr ? indicators.atr : null,
          score: setupScore.score,
          setupType: setupScore.setupType,
          momentum: setupScore.momentum ? setupScore.momentum : null,
          // Enhanced confidence scoring
          patternConfidence: confidenceFactors.patternConfidence,
          volumeConfidence: confidenceFactors.volumeConfidence,
          trendConfidence: confidenceFactors.trendConfidence,
          indicatorConfidence: confidenceFactors.indicatorConfidence,
          overallConfidence: confidenceFactors.overallConfidence,
          signalStrength: confidenceFactors.signalStrength,
        },
      });

      // Store detected patterns
      for (const pattern of detectedPatterns) {
        await db.detectedPattern.create({
          data: {
            scanId: scan.id,
            assetId: dbAsset.id,
            patternType: pattern.patternType,
            patternName: pattern.patternName,
            direction: pattern.direction,
            confidence: pattern.confidence,
            metadata: pattern.metadata || null,
          },
        });
      }

      // Store support/resistance levels
      for (const level of srLevels) {
        await db.supportResistanceLevel.create({
          data: {
            scanId: scan.id,
            assetId: dbAsset.id,
            level: level.level,
            type: level.type,
            strength: level.strength,
            proximity: level.proximity,
          },
        });
      }

      // 4. AI Analysis (optional, async - don't block scan)
      const aiService = getAIAnalysisService();
      if (detectedPatterns.length > 0) {
        // Generate pattern review in background
        aiService
          .getOrGenerateAnalysis(
            dbAsset.id,
            scan.id,
            'pattern_review',
            {
              patterns: detectedPatterns,
              ohlcv,
              indicators,
              symbol: asset.symbol,
            }
          )
          .catch((error) => {
            console.error(`[MarketScanner] AI analysis error for ${asset.symbol}:`, error);
          });
      }

      // Generate comprehensive analysis in background
      aiService
        .getOrGenerateAnalysis(
          dbAsset.id,
          scan.id,
          'comprehensive',
          {
            patterns: detectedPatterns,
            ohlcv,
            indicators,
            symbol: asset.symbol,
          }
        )
        .catch((error) => {
          console.error(`[MarketScanner] AI comprehensive analysis error for ${asset.symbol}:`, error);
        });

      return {
        assetId: dbAsset.id,
        symbol: asset.symbol,
        price: priceData.quote,
        change24h,
        indicators,
        score: setupScore.score,
        setupType: setupScore.setupType,
        momentum: setupScore.momentum,
      };
    } catch (error) {
      console.error(`[MarketScanner] Error scanning ${asset.symbol}:`, error);
      return null;
    }
  }

  /**
   * Scan all tracked assets
   */
  async scanAllAssets(): Promise<ScanResult[]> {
    console.log('[MarketScanner] Starting full market scan...');

    // Get all tracked assets from Deriv
    const assets = await this.derivService.getAllTrackedAssets();
    console.log(`[MarketScanner] Found ${assets.length} assets to scan`);

    // Ensure all assets exist in database
    for (const asset of assets) {
      await db.marketAsset.upsert({
        where: { symbol: asset.symbol },
        create: {
          symbol: asset.symbol,
          displayName: asset.displayName,
          category: asset.category,
          active: true,
        },
        update: {
          displayName: asset.displayName,
          active: true,
        },
      });
    }

    // Scan all assets (with rate limiting)
    const results: ScanResult[] = [];
    for (const asset of assets) {
      const result = await this.scanAsset(asset);
      if (result) {
        results.push(result);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[MarketScanner] Scan complete: ${results.length}/${assets.length} assets scanned successfully`);

    return results;
  }

  /**
   * Get latest scans with rankings
   */
  async getLatestScans(limit: number = 25): Promise<any[]> {
    try {
      // Get distinct latest scan per asset
      const assets = await db.marketAsset.findMany({
        where: { active: true },
        include: {
          scans: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      // Filter assets that have scans and flatten
      const scansWithAssets = assets
        .filter(asset => asset.scans.length > 0)
        .map(asset => ({
          ...asset.scans[0],
          asset: {
            id: asset.id,
            symbol: asset.symbol,
            displayName: asset.displayName,
            category: asset.category,
          },
        }));

      // Sort by score (or overallConfidence if available)
      const sorted = scansWithAssets.sort((a, b) => {
        const scoreA = a.overallConfidence ? Number(a.overallConfidence) : Number(a.score);
        const scoreB = b.overallConfidence ? Number(b.overallConfidence) : Number(b.score);
        return scoreB - scoreA;
      });

      // Apply limit and add rank
      return sorted.slice(0, limit).map((scan, index) => ({
        ...scan,
        rank: index + 1,
      }));
    } catch (error) {
      console.error('[MarketScanner] Error getting latest scans:', error);
      return [];
    }
  }
}

// Singleton instance
let marketScannerService: MarketScannerService | null = null;

export function getMarketScannerService(): MarketScannerService {
  if (!marketScannerService) {
    marketScannerService = new MarketScannerService();
  }
  return marketScannerService;
}

