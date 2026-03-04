/**
 * Vitality Stats Service - Calculates and manages vitality statistics for assets
 */

import { db } from '../lib/db';
import { getDerivDataService } from './deriv-data.service';

export interface VitalityStatsData {
  gsr?: number; // Gold-to-Silver Ratio
  week52High?: number;
  week52Low?: number;
  deficit?: string; // e.g., "67 Million Ounces"
  rateSpread?: number; // Fed-ECB spread in bps
}

export class VitalityStatsService {
  private derivService = getDerivDataService();

  /**
   * Calculate or fetch vitality stats for an asset
   */
  async getOrCalculateVitalityStats(assetId: string, symbol: string): Promise<VitalityStatsData> {
    // Check if we have existing stats
    const existing = await db.vitalityStats.findUnique({
      where: { assetId },
    });

    // Calculate 52-week high/low from historical scans
    const week52HighLow = await this.calculate52WeekHighLow(assetId);

    // Calculate GSR if this is a silver asset
    const gsr = await this.calculateGSR(symbol);

    // Fetch external data (with fallbacks)
    const deficit = await this.getDeficitData(symbol);
    const rateSpread = await this.getRateSpread();

    const stats: VitalityStatsData = {
      gsr,
      week52High: week52HighLow.high,
      week52Low: week52Low.low,
      deficit,
      rateSpread,
    };

    // Upsert stats in database
    await db.vitalityStats.upsert({
      where: { assetId },
      create: {
        assetId,
        gsr: stats.gsr ? stats.gsr : null,
        week52High: stats.week52High ? stats.week52High : null,
        week52Low: stats.week52Low ? stats.week52Low : null,
        deficit: stats.deficit || null,
        rateSpread: stats.rateSpread ? stats.rateSpread : null,
      },
      update: {
        gsr: stats.gsr ? stats.gsr : null,
        week52High: stats.week52High ? stats.week52High : null,
        week52Low: stats.week52Low ? stats.week52Low : null,
        deficit: stats.deficit || null,
        rateSpread: stats.rateSpread ? stats.rateSpread : null,
      },
    });

    return stats;
  }

  /**
   * Calculate 52-week high and low from historical scans
   */
  private async calculate52WeekHighLow(assetId: string): Promise<{ high: number | null; low: number | null }> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const scans = await db.marketScan.findMany({
      where: {
        assetId,
        timestamp: {
          gte: oneYearAgo,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    if (scans.length === 0) {
      return { high: null, low: null };
    }

    let high = Number(scans[0].price);
    let low = Number(scans[0].price);

    for (const scan of scans) {
      const price = Number(scan.price);
      if (price > high) high = price;
      if (price < low) low = price;
    }

    return { high, low };
  }

  /**
   * Calculate Gold-to-Silver Ratio (GSR)
   * Only applicable for silver (XAGUSD) or gold (XAUUSD) assets
   */
  private async calculateGSR(symbol: string): Promise<number | null> {
    // GSR is only relevant for precious metals
    if (symbol !== 'XAGUSD' && symbol !== 'XAUUSD') {
      return null;
    }

    try {
      // Fetch current gold and silver prices
      const goldPrice = await this.derivService.getPrice('XAUUSD');
      const silverPrice = await this.derivService.getPrice('XAGUSD');

      if (!goldPrice || !silverPrice) {
        console.warn('[VitalityStats] Could not fetch gold/silver prices for GSR calculation');
        return null;
      }

      // GSR = Gold Price / Silver Price
      const gsr = goldPrice.quote / silverPrice.quote;
      return parseFloat(gsr.toFixed(4));
    } catch (error) {
      console.error('[VitalityStats] Error calculating GSR:', error);
      return null;
    }
  }

  /**
   * Get deficit data for an asset
   * For now, returns placeholder/manual data
   * Can be extended to fetch from external APIs (e.g., Silver Institute)
   */
  private async getDeficitData(symbol: string): Promise<string | null> {
    // Placeholder data - can be extended with external API calls
    const deficitMap: Record<string, string> = {
      XAGUSD: '67 Million Ounces', // Example for silver
      XAUUSD: null, // Gold doesn't typically have deficit data in the same format
    };

    return deficitMap[symbol] || null;
  }

  /**
   * Get Fed-ECB rate spread
   * Returns placeholder data for now
   * Can be extended to fetch from Fed/ECB APIs
   */
  private async getRateSpread(): Promise<number | null> {
    // Placeholder: 150-175 bps spread
    // In production, this would fetch from:
    // - Federal Reserve API for Fed rates
    // - ECB API for ECB rates
    // Then calculate the spread in basis points

    // For now, return a placeholder value
    return 162.5; // Midpoint of 150-175 bps
  }

  /**
   * Get vitality stats for an asset
   */
  async getVitalityStats(assetId: string): Promise<VitalityStatsData | null> {
    const stats = await db.vitalityStats.findUnique({
      where: { assetId },
    });

    if (!stats) {
      return null;
    }

    return {
      gsr: stats.gsr ? Number(stats.gsr) : undefined,
      week52High: stats.week52High ? Number(stats.week52High) : undefined,
      week52Low: stats.week52Low ? Number(stats.week52Low) : undefined,
      deficit: stats.deficit || undefined,
      rateSpread: stats.rateSpread ? Number(stats.rateSpread) : undefined,
    };
  }
}

let vitalityStatsService: VitalityStatsService | null = null;

export function getVitalityStatsService(): VitalityStatsService {
  if (!vitalityStatsService) {
    vitalityStatsService = new VitalityStatsService();
  }
  return vitalityStatsService;
}

