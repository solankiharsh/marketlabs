/**
 * Confidence Scorer Service - Multi-factor weighted scoring system (Acumen)
 * 
 * Factors:
 * - Pattern Confidence (35%): Geometric match quality
 * - Volume Confirmation (20%): Volume alignment with pattern
 * - Trend Alignment (20%): Price > EMA-21 > EMA-50 alignment
 * - Indicator Confluence (25%): RSI zone + MACD histogram
 */

import { DetectedPattern } from './pattern-detection.service';

export interface ConfidenceFactors {
  patternConfidence: number; // 0-100
  volumeConfidence: number; // 0-100
  trendConfidence: number; // 0-100
  indicatorConfidence: number; // 0-100
  overallConfidence: number; // 0-100 (weighted sum)
  signalStrength: 'strong' | 'moderate' | 'weak';
}

export interface ConfidenceInputs {
  patterns: DetectedPattern[];
  volume?: number;
  averageVolume?: number;
  price: number;
  ema21?: number;
  ema50?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
}

export class ConfidenceScorerService {
  private readonly WEIGHTS = {
    pattern: 0.35,
    volume: 0.20,
    trend: 0.20,
    indicator: 0.25,
  };

  /**
   * Calculate confidence factors
   */
  calculateConfidence(inputs: ConfidenceInputs): ConfidenceFactors {
    const patternConfidence = this.calculatePatternConfidence(inputs.patterns);
    const volumeConfidence = this.calculateVolumeConfidence(
      inputs.volume,
      inputs.averageVolume
    );
    const trendConfidence = this.calculateTrendConfidence(
      inputs.price,
      inputs.ema21,
      inputs.ema50
    );
    const indicatorConfidence = this.calculateIndicatorConfidence(
      inputs.rsi,
      inputs.macd,
      inputs.macdSignal,
      inputs.macdHistogram
    );

    // Calculate weighted overall confidence
    const overallConfidence =
      patternConfidence * this.WEIGHTS.pattern +
      volumeConfidence * this.WEIGHTS.volume +
      trendConfidence * this.WEIGHTS.trend +
      indicatorConfidence * this.WEIGHTS.indicator;

    // Determine signal strength
    let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
    if (overallConfidence > 75) {
      signalStrength = 'strong';
    } else if (overallConfidence >= 55) {
      signalStrength = 'moderate';
    }

    return {
      patternConfidence,
      volumeConfidence,
      trendConfidence,
      indicatorConfidence,
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      signalStrength,
    };
  }

  /**
   * Pattern Confidence (35%)
   * How well the detected pattern matches its ideal geometric form
   */
  private calculatePatternConfidence(patterns: DetectedPattern[]): number {
    if (patterns.length === 0) {
      return 50; // Neutral if no patterns
    }

    // Use the highest confidence pattern
    const bestPattern = patterns.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    // Base confidence from pattern detection
    let confidence = bestPattern.confidence;

    // Boost confidence if multiple patterns agree on direction
    const bullishPatterns = patterns.filter(p => p.direction === 'bullish').length;
    const bearishPatterns = patterns.filter(p => p.direction === 'bearish').length;

    if (bullishPatterns > 1 && bestPattern.direction === 'bullish') {
      confidence = Math.min(100, confidence + 5 * (bullishPatterns - 1));
    } else if (bearishPatterns > 1 && bestPattern.direction === 'bearish') {
      confidence = Math.min(100, confidence + 5 * (bearishPatterns - 1));
    }

    // Apply geometric quality from metadata if available
    if (bestPattern.metadata) {
      if (bestPattern.metadata.symmetry !== undefined) {
        // Higher symmetry = higher confidence
        const symmetryBoost = (bestPattern.metadata.symmetry - 90) * 0.2;
        confidence = Math.min(100, confidence + symmetryBoost);
      }
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Volume Confirmation (20%)
   * Whether volume behavior aligns with expected pattern
   */
  private calculateVolumeConfidence(
    volume?: number,
    averageVolume?: number
  ): number {
    if (!volume || !averageVolume || averageVolume === 0) {
      return 50; // Neutral if no volume data
    }

    const volumeRatio = volume / averageVolume;

    // Higher volume (1.2x+) increases confidence
    if (volumeRatio >= 1.2) {
      return 100;
    } else if (volumeRatio >= 1.0) {
      return 75;
    } else if (volumeRatio >= 0.8) {
      return 50;
    } else {
      return 25; // Low volume reduces confidence
    }
  }

  /**
   * Trend Alignment (20%)
   * Checks if price, EMA-21, and EMA-50 align
   */
  private calculateTrendConfidence(
    price: number,
    ema21?: number,
    ema50?: number
  ): number {
    if (!ema21 || !ema50) {
      return 50; // Neutral if no EMA data
    }

    // Strong uptrend: Price > EMA-21 > EMA-50
    if (price > ema21 && ema21 > ema50) {
      return 90;
    }

    // Strong downtrend: Price < EMA-21 < EMA-50
    if (price < ema21 && ema21 < ema50) {
      return 90;
    }

    // Moderate uptrend: Price > EMA-21 but EMA-21 not > EMA-50
    if (price > ema21) {
      return 60;
    }

    // Moderate downtrend: Price < EMA-21 but EMA-21 not < EMA-50
    if (price < ema21) {
      return 60;
    }

    // Neutral/choppy
    return 50;
  }

  /**
   * Indicator Confluence (25%)
   * Checks RSI zone and MACD histogram direction and momentum
   */
  private calculateIndicatorConfidence(
    rsi?: number,
    macd?: number,
    macdSignal?: number,
    macdHistogram?: number
  ): number {
    let confidence = 50; // Start neutral

    // RSI Zone Analysis
    if (rsi !== undefined) {
      if (rsi < 30) {
        // Oversold - bullish signal
        confidence += 15;
      } else if (rsi > 70) {
        // Overbought - bearish signal
        confidence += 15;
      } else if (rsi > 50) {
        // Bullish momentum
        confidence += 5;
      } else {
        // Bearish momentum
        confidence -= 5;
      }
    }

    // MACD Analysis
    if (macd !== undefined && macdSignal !== undefined) {
      const histogram = macdHistogram || macd - macdSignal;

      if (histogram > 0 && macd > macdSignal) {
        // Bullish crossover above zero
        confidence += 15;
      } else if (histogram < 0 && macd < macdSignal) {
        // Bearish crossover below zero
        confidence += 15;
      } else if (histogram > 0) {
        // Positive histogram
        confidence += 5;
      } else {
        // Negative histogram
        confidence -= 5;
      }
    }

    return Math.max(0, Math.min(100, confidence));
  }
}

let confidenceScorerService: ConfidenceScorerService | null = null;

export function getConfidenceScorerService(): ConfidenceScorerService {
  if (!confidenceScorerService) {
    confidenceScorerService = new ConfidenceScorerService();
  }
  return confidenceScorerService;
}

