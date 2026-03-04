/**
 * Technical Indicators Service - Calculate RSI, MACD, SMA, EMA, Bollinger Bands, ADX, ATR
 */

import { DerivOHLCV } from './deriv-data.service';

export interface TechnicalIndicators {
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  sma20?: number;
  ema50?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  adx?: number;
  atr?: number;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(prices: number[], period: number = 14): number | undefined {
  if (prices.length < period + 1) return undefined;

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  let gains = 0;
  let losses = 0;

  // Initial average
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) gains += changes[i];
    else losses += Math.abs(changes[i]);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smoothed average for remaining periods
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number; signal: number; histogram: number } | undefined {
  // MACD calculation requirements:
  // - Fast EMA (12): needs 12 prices, starts at index 11
  // - Slow EMA (26): needs 26 prices, starts at index 25
  // - MACD line: difference between aligned EMAs, starts where slow EMA starts
  // - Signal line: 9-period EMA of MACD line, needs 9 MACD values
  // Minimum: 26 (slow) + 9 (signal) = 35 prices
  if (prices.length < slowPeriod + signalPeriod) {
    return undefined;
  }

  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  if (!fastEMA || !slowEMA) return undefined;

  // Align EMAs: fast EMA has more values (starts earlier)
  // Both EMAs are arrays where index 0 corresponds to the first calculated value
  // fastEMA[0] = EMA of prices[0..11] (12 values)
  // slowEMA[0] = EMA of prices[0..25] (26 values)
  // To align: fastEMA[i + offset] corresponds to slowEMA[i] where offset = slowPeriod - fastPeriod
  const offset = slowPeriod - fastPeriod; // 26 - 12 = 14
  
  // Calculate MACD line from aligned EMAs
  const macdLine: number[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    const fastIndex = i + offset;
    if (fastIndex < fastEMA.length) {
      macdLine.push(fastEMA[fastIndex] - slowEMA[i]);
    }
  }

  if (macdLine.length < signalPeriod) return undefined;

  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMA(macdLine, signalPeriod);
  if (!signalLine || signalLine.length === 0) return undefined;

  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

/**
 * Calculate SMA (Simple Moving Average)
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }

  return sma;
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
export function calculateEMA(prices: number[], period: number): number[] | undefined {
  if (prices.length < period) return undefined;

  const multiplier = 2 / (period + 1);
  const ema: number[] = [];

  // Start with SMA
  const initialSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(initialSMA);

  // Calculate EMA for remaining periods
  for (let i = period; i < prices.length; i++) {
    const value = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(value);
  }

  return ema;
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number; middle: number; lower: number } | undefined {
  if (prices.length < period) return undefined;

  const sma = calculateSMA(prices, period);
  if (sma.length === 0) return undefined;

  const middle = sma[sma.length - 1];
  const recentPrices = prices.slice(-period);

  // Calculate standard deviation
  const variance = recentPrices.reduce((sum, price) => {
    return sum + Math.pow(price - middle, 2);
  }, 0) / period;

  const standardDeviation = Math.sqrt(variance);
  const upper = middle + (standardDeviation * stdDev);
  const lower = middle - (standardDeviation * stdDev);

  return { upper, middle, lower };
}

/**
 * Calculate ATR (Average True Range)
 */
export function calculateATR(ohlcv: DerivOHLCV[], period: number = 14): number | undefined {
  if (ohlcv.length < period + 1) return undefined;

  const trueRanges: number[] = [];

  for (let i = 1; i < ohlcv.length; i++) {
    const current = ohlcv[i];
    const previous = ohlcv[i - 1];

    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);

    trueRanges.push(Math.max(tr1, tr2, tr3));
  }

  // Calculate ATR as SMA of true ranges
  const atrValues = calculateSMA(trueRanges, period);
  return atrValues.length > 0 ? atrValues[atrValues.length - 1] : undefined;
}

/**
 * Calculate ADX (Average Directional Index) - simplified version
 */
export function calculateADX(ohlcv: DerivOHLCV[], period: number = 14): number | undefined {
  if (ohlcv.length < period * 2) return undefined;

  // Simplified ADX calculation
  // Full ADX requires +DI and -DI calculations which are complex
  // This is a simplified version for MVP
  
  const priceChanges: number[] = [];
  for (let i = 1; i < ohlcv.length; i++) {
    const change = ohlcv[i].close - ohlcv[i - 1].close;
    priceChanges.push(Math.abs(change));
  }

  if (priceChanges.length < period) return undefined;

  const avgChange = calculateSMA(priceChanges, period);
  if (avgChange.length === 0) return undefined;

  // Normalize to 0-100 scale (simplified)
  const maxChange = Math.max(...priceChanges.slice(-period));
  if (maxChange === 0) return 0;

  const adx = (avgChange[avgChange.length - 1] / maxChange) * 100;
  return Math.min(100, Math.max(0, adx));
}

/**
 * Calculate all technical indicators from OHLCV data
 */
export function calculateAllIndicators(ohlcv: DerivOHLCV[]): TechnicalIndicators {
  // Minimum requirements:
  // - RSI (14): needs 15+ data points
  // - MACD (12/26/9): needs 35+ data points (26 + 9)
  // - SMA 20: needs 20+ data points
  // - EMA 50: needs 50+ data points
  // - BB (20): needs 20+ data points
  // - ATR (14): needs 15+ data points
  // - ADX (14): needs 28+ data points (simplified)
  // So minimum is 50 for EMA50, but we can calculate others with less
  
  if (ohlcv.length < 20) {
    // Not enough data for most indicators
    return {};
  }

  const closes = ohlcv.map(c => c.close);

  // Calculate indicators that don't require full dataset
  const rsi = closes.length >= 15 ? calculateRSI(closes, 14) : undefined;
  const sma20 = closes.length >= 20 ? calculateSMA(closes, 20) : [];
  const bb = closes.length >= 20 ? calculateBollingerBands(closes, 20, 2) : undefined;
  const atr = ohlcv.length >= 15 ? calculateATR(ohlcv, 14) : undefined;
  const adx = ohlcv.length >= 28 ? calculateADX(ohlcv, 14) : undefined;
  
  // MACD needs at least 35 data points
  const macd = closes.length >= 35 ? calculateMACD(closes) : undefined;
  
  // EMA 50 needs at least 50 data points
  const ema50 = closes.length >= 50 ? calculateEMA(closes, 50) : undefined;

  return {
    rsi,
    macd: macd?.macd,
    macdSignal: macd?.signal,
    macdHistogram: macd?.histogram,
    sma20: sma20.length > 0 ? sma20[sma20.length - 1] : undefined,
    ema50: ema50 && ema50.length > 0 ? ema50[ema50.length - 1] : undefined,
    bbUpper: bb?.upper,
    bbMiddle: bb?.middle,
    bbLower: bb?.lower,
    atr,
    adx,
  };
}

