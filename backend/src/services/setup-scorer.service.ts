/**
 * Setup Scorer Service - Composite scoring algorithm for ranking trading opportunities
 */

import { TechnicalIndicators } from './indicators.service';

export interface SetupScore {
  score: number; // 0-100
  setupType: 'bullish' | 'bearish' | 'neutral';
  momentum: number; // -100 to +100
  factors: {
    rsiStrength: number;
    macdStrength: number;
    trendStrength: number;
    volatilityScore: number;
    patternScore: number;
  };
}

/**
 * Calculate composite score from technical indicators
 */
export function calculateSetupScore(
  indicators: TechnicalIndicators,
  price: number,
  change24h?: number
): SetupScore {
  const factors = {
    rsiStrength: 0,
    macdStrength: 0,
    trendStrength: 0,
    volatilityScore: 0,
    patternScore: 0,
  };

  // RSI Strength (0-25 points)
  if (indicators.rsi !== undefined) {
    if (indicators.rsi < 30) {
      // Oversold - bullish signal
      factors.rsiStrength = 25;
    } else if (indicators.rsi > 70) {
      // Overbought - bearish signal
      factors.rsiStrength = -25;
    } else if (indicators.rsi > 50) {
      // Bullish momentum
      factors.rsiStrength = (indicators.rsi - 50) / 20 * 15; // 0-15 points
    } else {
      // Bearish momentum
      factors.rsiStrength = (50 - indicators.rsi) / 20 * -15; // -15 to 0 points
    }
  }

  // MACD Strength (0-25 points)
  if (indicators.macd !== undefined && indicators.macdSignal !== undefined) {
    const macdHistogram = indicators.macdHistogram || (indicators.macd - indicators.macdSignal);
    
    if (macdHistogram > 0 && indicators.macd > indicators.macdSignal) {
      // Bullish crossover
      factors.macdStrength = Math.min(25, Math.abs(macdHistogram) * 100);
    } else if (macdHistogram < 0 && indicators.macd < indicators.macdSignal) {
      // Bearish crossover
      factors.macdStrength = -Math.min(25, Math.abs(macdHistogram) * 100);
    }
  }

  // Trend Strength (0-25 points)
  if (indicators.sma20 !== undefined && indicators.ema50 !== undefined && price) {
    const aboveSMA20 = price > indicators.sma20;
    const aboveEMA50 = price > indicators.ema50;
    const smaAboveEMA = indicators.sma20 > indicators.ema50;

    if (aboveSMA20 && aboveEMA50 && smaAboveEMA) {
      // Strong uptrend
      factors.trendStrength = 25;
    } else if (!aboveSMA20 && !aboveEMA50 && !smaAboveEMA) {
      // Strong downtrend
      factors.trendStrength = -25;
    } else if (aboveSMA20 && aboveEMA50) {
      // Moderate uptrend
      factors.trendStrength = 15;
    } else if (!aboveSMA20 && !aboveEMA50) {
      // Moderate downtrend
      factors.trendStrength = -15;
    } else {
      // Neutral/choppy
      factors.trendStrength = 0;
    }
  }

  // Volatility Score (0-15 points) - Higher volatility = more opportunity
  if (indicators.atr !== undefined && price) {
    const atrPercent = (indicators.atr / price) * 100;
    // Reward moderate to high volatility (1-5% ATR)
    if (atrPercent >= 1 && atrPercent <= 5) {
      factors.volatilityScore = 15;
    } else if (atrPercent > 5) {
      factors.volatilityScore = 10; // Very high volatility (risky)
    } else {
      factors.volatilityScore = 5; // Low volatility
    }
  }

  // Pattern Score (0-10 points) - Simplified pattern detection
  if (indicators.bbUpper !== undefined && indicators.bbLower !== undefined && price) {
    const bbWidth = indicators.bbUpper - indicators.bbLower;
    const bbPosition = (price - indicators.bbLower) / bbWidth;

    if (bbPosition < 0.2) {
      // Near lower band - potential bounce
      factors.patternScore = 10;
    } else if (bbPosition > 0.8) {
      // Near upper band - potential reversal
      factors.patternScore = -10;
    } else {
      factors.patternScore = 0;
    }
  }

  // Calculate total score (0-100, normalized)
  const rawScore = 
    factors.rsiStrength +
    factors.macdStrength +
    factors.trendStrength +
    factors.volatilityScore +
    factors.patternScore;

  // Normalize to 0-100 scale
  const score = Math.max(0, Math.min(100, 50 + rawScore));

  // Determine setup type
  let setupType: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (score >= 70) {
    setupType = 'bullish';
  } else if (score <= 30) {
    setupType = 'bearish';
  }

  // Calculate momentum (-100 to +100)
  const momentum = rawScore * 2; // Scale to -100 to +100
  const normalizedMomentum = Math.max(-100, Math.min(100, momentum));

  return {
    score,
    setupType,
    momentum: normalizedMomentum,
    factors,
  };
}

/**
 * Rank assets by score
 */
export function rankAssets(scores: Array<{ symbol: string; score: SetupScore }>): Array<{ symbol: string; score: SetupScore; rank: number }> {
  return scores
    .sort((a, b) => b.score.score - a.score.score)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}

