/**
 * Support & Resistance Detection Service
 * Implements Acumen's 3-step process: Pivot Detection → Clustering → Classification
 */

import { DerivOHLCV } from '../types';

export interface SupportResistanceLevel {
  level: number;
  type: 'support' | 'resistance';
  strength: number; // Number of touches
  proximity: number; // Distance from current price in %
}

export class SupportResistanceService {
  /**
   * Detect support and resistance levels
   */
  async detectLevels(
    ohlcv: DerivOHLCV[],
    currentPrice: number
  ): Promise<SupportResistanceLevel[]> {
    if (ohlcv.length < 20) {
      return [];
    }

    // Step 1: Pivot Detection (20-candle lookback)
    const pivotHighs = this.findPivotHighs(ohlcv, 20);
    const pivotLows = this.findPivotLows(ohlcv, 20);

    // Step 2: Clustering (group nearby pivots within 2% threshold)
    const resistanceClusters = this.clusterPivots(pivotHighs, 0.02);
    const supportClusters = this.clusterPivots(pivotLows, 0.02);

    // Step 3: Classification and Ranking
    const resistanceLevels = this.classifyLevels(
      resistanceClusters,
      currentPrice,
      'resistance'
    );
    const supportLevels = this.classifyLevels(supportClusters, currentPrice, 'support');

    // Combine and sort by proximity, limit to top 5 each
    const allLevels = [...supportLevels, ...resistanceLevels].sort(
      (a, b) => a.proximity - b.proximity
    );

    // Return top 5 support and top 5 resistance
    const topSupport = supportLevels
      .sort((a, b) => a.proximity - b.proximity)
      .slice(0, 5);
    const topResistance = resistanceLevels
      .sort((a, b) => a.proximity - b.proximity)
      .slice(0, 5);

    return [...topSupport, ...topResistance];
  }

  /**
   * Find pivot highs (local maxima)
   */
  private findPivotHighs(ohlcv: DerivOHLCV[], lookback: number): number[] {
    const pivots: number[] = [];
    const highs = ohlcv.map(c => c.high);

    for (let i = lookback; i < highs.length - lookback; i++) {
      let isPivot = true;
      const currentHigh = highs[i];

      // Check all points within lookback window
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && highs[j] >= currentHigh) {
          isPivot = false;
          break;
        }
      }

      if (isPivot) {
        pivots.push(currentHigh);
      }
    }

    return pivots;
  }

  /**
   * Find pivot lows (local minima)
   */
  private findPivotLows(ohlcv: DerivOHLCV[], lookback: number): number[] {
    const pivots: number[] = [];
    const lows = ohlcv.map(c => c.low);

    for (let i = lookback; i < lows.length - lookback; i++) {
      let isPivot = true;
      const currentLow = lows[i];

      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && lows[j] <= currentLow) {
          isPivot = false;
          break;
        }
      }

      if (isPivot) {
        pivots.push(currentLow);
      }
    }

    return pivots;
  }

  /**
   * Cluster nearby pivot points (within threshold percentage)
   */
  private clusterPivots(pivots: number[], threshold: number): Map<number, number[]> {
    const clusters = new Map<number, number[]>();
    const sortedPivots = [...pivots].sort((a, b) => a - b);

    for (const pivot of sortedPivots) {
      let foundCluster = false;

      // Check if pivot belongs to existing cluster
      for (const [clusterCenter, clusterPivots] of clusters.entries()) {
        const distance = Math.abs(pivot - clusterCenter) / clusterCenter;
        if (distance <= threshold) {
          clusterPivots.push(pivot);
          foundCluster = true;

          // Recalculate cluster center as average
          const newCenter = clusterPivots.reduce((sum, p) => sum + p, 0) / clusterPivots.length;
          clusters.delete(clusterCenter);
          clusters.set(newCenter, clusterPivots);
          break;
        }
      }

      // Create new cluster if not found
      if (!foundCluster) {
        clusters.set(pivot, [pivot]);
      }
    }

    return clusters;
  }

  /**
   * Classify levels as support or resistance and calculate strength/proximity
   */
  private classifyLevels(
    clusters: Map<number, number[]>,
    currentPrice: number,
    type: 'support' | 'resistance'
  ): SupportResistanceLevel[] {
    const levels: SupportResistanceLevel[] = [];

    for (const [level, touches] of clusters.entries()) {
      // Verify classification
      const isSupport = level < currentPrice;
      const isResistance = level > currentPrice;

      if ((type === 'support' && !isSupport) || (type === 'resistance' && !isResistance)) {
        continue;
      }

      const strength = touches.length;
      const proximity = (Math.abs(level - currentPrice) / currentPrice) * 100;

      levels.push({
        level,
        type,
        strength,
        proximity,
      });
    }

    return levels;
  }
}

let supportResistanceService: SupportResistanceService | null = null;

export function getSupportResistanceService(): SupportResistanceService {
  if (!supportResistanceService) {
    supportResistanceService = new SupportResistanceService();
  }
  return supportResistanceService;
}

