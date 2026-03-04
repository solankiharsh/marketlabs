/**
 * Pattern Detection Service - Implements Acumen's 24 pattern detectors
 * Based on Bulkowski's "Encyclopedia of Chart Patterns" and quantitative research
 */

import { DerivOHLCV } from '../types';

export interface DetectedPattern {
  patternType: 'chart' | 'candlestick';
  patternName: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  metadata?: {
    pivotPoints?: number[];
    symmetry?: number;
    spacing?: number;
    depth?: number;
  };
}

export class PatternDetectionService {
  /**
   * Detect all patterns in OHLCV data
   */
  async detectPatterns(ohlcv: DerivOHLCV[]): Promise<DetectedPattern[]> {
    if (ohlcv.length < 20) {
      return []; // Need minimum data
    }

    const patterns: DetectedPattern[] = [];

    // Detect candlestick patterns (15)
    const candlestickPatterns = this.detectCandlestickPatterns(ohlcv);
    patterns.push(...candlestickPatterns);

    // Detect chart patterns (9)
    const chartPatterns = this.detectChartPatterns(ohlcv);
    patterns.push(...chartPatterns);

    return patterns;
  }

  /**
   * Detect candlestick patterns (15 patterns)
   */
  private detectCandlestickPatterns(ohlcv: DerivOHLCV[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const closes = ohlcv.map(c => c.close);
    const opens = ohlcv.map(c => c.open);
    const highs = ohlcv.map(c => c.high);
    const lows = ohlcv.map(c => c.low);

    // Need at least 3 candles for most patterns
    if (ohlcv.length < 3) return patterns;

    // Detect each pattern
    for (let i = 2; i < ohlcv.length; i++) {
      const current = ohlcv[i];
      const prev = ohlcv[i - 1];
      const prev2 = ohlcv[i - 2];

      // Doji
      const doji = this.detectDoji(current);
      if (doji) patterns.push({ ...doji, metadata: { pivotPoints: [i] } });

      // Hammer
      const hammer = this.detectHammer(current);
      if (hammer) patterns.push({ ...hammer, metadata: { pivotPoints: [i] } });

      // Inverted Hammer
      const invHammer = this.detectInvertedHammer(current);
      if (invHammer) patterns.push({ ...invHammer, metadata: { pivotPoints: [i] } });

      // Hanging Man
      const hangingMan = this.detectHangingMan(current, prev);
      if (hangingMan) patterns.push({ ...hangingMan, metadata: { pivotPoints: [i] } });

      // Shooting Star
      const shootingStar = this.detectShootingStar(current, prev);
      if (shootingStar) patterns.push({ ...shootingStar, metadata: { pivotPoints: [i] } });

      // Bullish Engulfing
      const bullEngulf = this.detectBullishEngulfing(prev, current);
      if (bullEngulf) patterns.push({ ...bullEngulf, metadata: { pivotPoints: [i - 1, i] } });

      // Bearish Engulfing
      const bearEngulf = this.detectBearishEngulfing(prev, current);
      if (bearEngulf) patterns.push({ ...bearEngulf, metadata: { pivotPoints: [i - 1, i] } });

      // Morning Star
      const morningStar = this.detectMorningStar(prev2, prev, current);
      if (morningStar) patterns.push({ ...morningStar, metadata: { pivotPoints: [i - 2, i - 1, i] } });

      // Evening Star
      const eveningStar = this.detectEveningStar(prev2, prev, current);
      if (eveningStar) patterns.push({ ...eveningStar, metadata: { pivotPoints: [i - 2, i - 1, i] } });

      // Three White Soldiers
      if (i >= 2) {
        const threeWhite = this.detectThreeWhiteSoldiers([ohlcv[i - 2], prev, current]);
        if (threeWhite) patterns.push({ ...threeWhite, metadata: { pivotPoints: [i - 2, i - 1, i] } });
      }

      // Three Black Crows
      if (i >= 2) {
        const threeBlack = this.detectThreeBlackCrows([ohlcv[i - 2], prev, current]);
        if (threeBlack) patterns.push({ ...threeBlack, metadata: { pivotPoints: [i - 2, i - 1, i] } });
      }

      // Piercing Line
      const piercing = this.detectPiercingLine(prev, current);
      if (piercing) patterns.push({ ...piercing, metadata: { pivotPoints: [i - 1, i] } });

      // Dark Cloud Cover
      const darkCloud = this.detectDarkCloudCover(prev, current);
      if (darkCloud) patterns.push({ ...darkCloud, metadata: { pivotPoints: [i - 1, i] } });

      // Tweezer Top
      if (i >= 1) {
        const tweezerTop = this.detectTweezerTop(prev, current);
        if (tweezerTop) patterns.push({ ...tweezerTop, metadata: { pivotPoints: [i - 1, i] } });
      }

      // Tweezer Bottom
      if (i >= 1) {
        const tweezerBottom = this.detectTweezerBottom(prev, current);
        if (tweezerBottom) patterns.push({ ...tweezerBottom, metadata: { pivotPoints: [i - 1, i] } });
      }
    }

    return patterns;
  }

  /**
   * Detect chart patterns (9 patterns)
   */
  private detectChartPatterns(ohlcv: DerivOHLCV[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Smooth data with 3-period SMA for chart patterns
    const smoothed = this.smoothData(ohlcv.map(c => c.close), 3);
    const highs = ohlcv.map(c => c.high);
    const lows = ohlcv.map(c => c.low);

    // Find pivot points (5-bar lookback)
    const pivotHighs = this.findPivotHighs(smoothed, 5);
    const pivotLows = this.findPivotLows(smoothed, 5);

    // Head & Shoulders
    const headShoulders = this.detectHeadAndShoulders(pivotHighs, smoothed);
    if (headShoulders) patterns.push(headShoulders);

    // Inverse Head & Shoulders
    const invHeadShoulders = this.detectInverseHeadAndShoulders(pivotLows, smoothed);
    if (invHeadShoulders) patterns.push(invHeadShoulders);

    // Double Bottom
    const doubleBottom = this.detectDoubleBottom(pivotLows, smoothed);
    if (doubleBottom) patterns.push(doubleBottom);

    // Double Top
    const doubleTop = this.detectDoubleTop(pivotHighs, smoothed);
    if (doubleTop) patterns.push(doubleTop);

    // Ascending Triangle
    const ascTriangle = this.detectAscendingTriangle(highs, lows, smoothed);
    if (ascTriangle) patterns.push(ascTriangle);

    // Descending Triangle
    const descTriangle = this.detectDescendingTriangle(highs, lows, smoothed);
    if (descTriangle) patterns.push(descTriangle);

    // Cup & Handle
    const cupHandle = this.detectCupAndHandle(smoothed, pivotLows);
    if (cupHandle) patterns.push(cupHandle);

    // Bullish Flag
    const bullFlag = this.detectBullishFlag(smoothed, highs, lows);
    if (bullFlag) patterns.push(bullFlag);

    // Bearish Flag
    const bearFlag = this.detectBearishFlag(smoothed, highs, lows);
    if (bearFlag) patterns.push(bearFlag);

    return patterns;
  }

  // ─── Candlestick Pattern Detectors ───────────────────────────────

  private detectDoji(candle: DerivOHLCV): DetectedPattern | null {
    const body = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    if (range === 0) return null;

    const bodyRatio = body / range;
    if (bodyRatio < 0.1) {
      return {
        patternType: 'candlestick',
        patternName: 'Doji',
        direction: 'neutral',
        confidence: 70,
      };
    }
    return null;
  }

  private detectHammer(candle: DerivOHLCV): DetectedPattern | null {
    const body = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const range = candle.high - candle.low;

    if (range === 0) return null;

    const bodyPosition = (Math.min(candle.open, candle.close) - candle.low) / range;
    if (lowerShadow >= body * 2 && upperShadow < body * 0.5 && bodyPosition >= 0.6) {
      return {
        patternType: 'candlestick',
        patternName: 'Hammer',
        direction: 'bullish',
        confidence: 75,
      };
    }
    return null;
  }

  private detectInvertedHammer(candle: DerivOHLCV): DetectedPattern | null {
    const body = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const range = candle.high - candle.low;

    if (range === 0) return null;

    const bodyPosition = (Math.min(candle.open, candle.close) - candle.low) / range;
    if (upperShadow >= body * 2 && lowerShadow < body * 0.5 && bodyPosition <= 0.4) {
      return {
        patternType: 'candlestick',
        patternName: 'Inverted Hammer',
        direction: 'bullish',
        confidence: 70,
      };
    }
    return null;
  }

  private detectHangingMan(candle: DerivOHLCV, prev: DerivOHLCV): DetectedPattern | null {
    const body = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const range = candle.high - candle.low;
    const isUptrend = prev.close > prev.open && candle.close > prev.close;

    if (range === 0 || !isUptrend) return null;

    const bodyPosition = (Math.min(candle.open, candle.close) - candle.low) / range;
    if (lowerShadow >= body * 2 && bodyPosition >= 0.6) {
      return {
        patternType: 'candlestick',
        patternName: 'Hanging Man',
        direction: 'bearish',
        confidence: 70,
      };
    }
    return null;
  }

  private detectShootingStar(candle: DerivOHLCV, prev: DerivOHLCV): DetectedPattern | null {
    const body = Math.abs(candle.close - candle.open);
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const range = candle.high - candle.low;
    const isUptrend = prev.close > prev.open && candle.close > prev.close;

    if (range === 0 || !isUptrend) return null;

    const bodyPosition = (Math.min(candle.open, candle.close) - candle.low) / range;
    if (upperShadow >= body * 2 && bodyPosition <= 0.4) {
      return {
        patternType: 'candlestick',
        patternName: 'Shooting Star',
        direction: 'bearish',
        confidence: 75,
      };
    }
    return null;
  }

  private detectBullishEngulfing(prev: DerivOHLCV, current: DerivOHLCV): DetectedPattern | null {
    const prevBody = Math.abs(prev.close - prev.open);
    const currentBody = Math.abs(current.close - current.open);
    const isPrevBearish = prev.close < prev.open;
    const isCurrentBullish = current.close > current.open;

    if (isPrevBearish && isCurrentBullish && currentBody > prevBody * 1.1) {
      if (current.open < prev.close && current.close > prev.open) {
        return {
          patternType: 'candlestick',
          patternName: 'Bullish Engulfing',
          direction: 'bullish',
          confidence: 80,
        };
      }
    }
    return null;
  }

  private detectBearishEngulfing(prev: DerivOHLCV, current: DerivOHLCV): DetectedPattern | null {
    const prevBody = Math.abs(prev.close - prev.open);
    const currentBody = Math.abs(current.close - current.open);
    const isPrevBullish = prev.close > prev.open;
    const isCurrentBearish = current.close < current.open;

    if (isPrevBullish && isCurrentBearish && currentBody > prevBody * 1.1) {
      if (current.open > prev.close && current.close < prev.open) {
        return {
          patternType: 'candlestick',
          patternName: 'Bearish Engulfing',
          direction: 'bearish',
          confidence: 80,
        };
      }
    }
    return null;
  }

  private detectMorningStar(prev2: DerivOHLCV, prev: DerivOHLCV, current: DerivOHLCV): DetectedPattern | null {
    const isPrev2Bearish = prev2.close < prev2.open;
    const prev2Body = Math.abs(prev2.close - prev2.open);
    const prevBody = Math.abs(prev.close - prev.open);
    const isCurrentBullish = current.close > current.open;
    const gapDown = prev.open < prev2.close;
    const gapUp = current.open > prev.close;

    if (isPrev2Bearish && prevBody < prev2Body * 0.5 && isCurrentBullish && gapDown && gapUp) {
      return {
        patternType: 'candlestick',
        patternName: 'Morning Star',
        direction: 'bullish',
        confidence: 85,
      };
    }
    return null;
  }

  private detectEveningStar(prev2: DerivOHLCV, prev: DerivOHLCV, current: DerivOHLCV): DetectedPattern | null {
    const isPrev2Bullish = prev2.close > prev2.open;
    const prev2Body = Math.abs(prev2.close - prev2.open);
    const prevBody = Math.abs(prev.close - prev.open);
    const isCurrentBearish = current.close < current.open;
    const gapUp = prev.open > prev2.close;
    const gapDown = current.open < prev.close;

    if (isPrev2Bullish && prevBody < prev2Body * 0.5 && isCurrentBearish && gapUp && gapDown) {
      return {
        patternType: 'candlestick',
        patternName: 'Evening Star',
        direction: 'bearish',
        confidence: 85,
      };
    }
    return null;
  }

  private detectThreeWhiteSoldiers(candles: DerivOHLCV[]): DetectedPattern | null {
    if (candles.length < 3) return null;

    const allBullish = candles.every(c => c.close > c.open);
    const increasing = candles[1].close > candles[0].close && candles[2].close > candles[1].close;
    const smallShadows = candles.every(c => {
      const upperShadow = c.high - Math.max(c.open, c.close);
      const body = Math.abs(c.close - c.open);
      return upperShadow < body * 0.3;
    });

    if (allBullish && increasing && smallShadows) {
      return {
        patternType: 'candlestick',
        patternName: 'Three White Soldiers',
        direction: 'bullish',
        confidence: 80,
      };
    }
    return null;
  }

  private detectThreeBlackCrows(candles: DerivOHLCV[]): DetectedPattern | null {
    if (candles.length < 3) return null;

    const allBearish = candles.every(c => c.close < c.open);
    const decreasing = candles[1].close < candles[0].close && candles[2].close < candles[1].close;
    const smallShadows = candles.every(c => {
      const lowerShadow = Math.min(c.open, c.close) - c.low;
      const body = Math.abs(c.close - c.open);
      return lowerShadow < body * 0.3;
    });

    if (allBearish && decreasing && smallShadows) {
      return {
        patternType: 'candlestick',
        patternName: 'Three Black Crows',
        direction: 'bearish',
        confidence: 80,
      };
    }
    return null;
  }

  private detectPiercingLine(prev: DerivOHLCV, current: DerivOHLCV): DetectedPattern | null {
    const isPrevBearish = prev.close < prev.open;
    const isCurrentBullish = current.close > current.open;
    const prevMid = (prev.open + prev.close) / 2;
    const gapDown = current.open < prev.close;
    const closesAboveMid = current.close > prevMid && current.close < prev.open;

    if (isPrevBearish && isCurrentBullish && gapDown && closesAboveMid) {
      return {
        patternType: 'candlestick',
        patternName: 'Piercing Line',
        direction: 'bullish',
        confidence: 75,
      };
    }
    return null;
  }

  private detectDarkCloudCover(prev: DerivOHLCV, current: DerivOHLCV): DetectedPattern | null {
    const isPrevBullish = prev.close > prev.open;
    const isCurrentBearish = current.close < current.open;
    const prevMid = (prev.open + prev.close) / 2;
    const gapUp = current.open > prev.close;
    const closesBelowMid = current.close < prevMid && current.close > prev.open;

    if (isPrevBullish && isCurrentBearish && gapUp && closesBelowMid) {
      return {
        patternType: 'candlestick',
        patternName: 'Dark Cloud Cover',
        direction: 'bearish',
        confidence: 75,
      };
    }
    return null;
  }

  private detectTweezerTop(prev: DerivOHLCV, current: DerivOHLCV): DetectedPattern | null {
    const highDiff = Math.abs(current.high - prev.high) / Math.max(prev.high, current.high);
    const isPrevBullish = prev.close > prev.open;
    const isCurrentBearish = current.close < current.open;

    if (highDiff < 0.01 && isPrevBullish && isCurrentBearish) {
      return {
        patternType: 'candlestick',
        patternName: 'Tweezer Top',
        direction: 'bearish',
        confidence: 70,
      };
    }
    return null;
  }

  private detectTweezerBottom(prev: DerivOHLCV, current: DerivOHLCV): DetectedPattern | null {
    const lowDiff = Math.abs(current.low - prev.low) / Math.max(prev.low, current.low);
    const isPrevBearish = prev.close < prev.open;
    const isCurrentBullish = current.close > current.open;

    if (lowDiff < 0.01 && isPrevBearish && isCurrentBullish) {
      return {
        patternType: 'candlestick',
        patternName: 'Tweezer Bottom',
        direction: 'bullish',
        confidence: 70,
      };
    }
    return null;
  }

  // ─── Chart Pattern Detectors ───────────────────────────────

  private smoothData(data: number[], period: number): number[] {
    const smoothed: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      smoothed.push(sum / period);
    }
    return smoothed;
  }

  private findPivotHighs(data: number[], lookback: number): number[] {
    const pivots: number[] = [];
    for (let i = lookback; i < data.length - lookback; i++) {
      let isPivot = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && data[j] >= data[i]) {
          isPivot = false;
          break;
        }
      }
      if (isPivot) pivots.push(i);
    }
    return pivots;
  }

  private findPivotLows(data: number[], lookback: number): number[] {
    const pivots: number[] = [];
    for (let i = lookback; i < data.length - lookback; i++) {
      let isPivot = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && data[j] <= data[i]) {
          isPivot = false;
          break;
        }
      }
      if (isPivot) pivots.push(i);
    }
    return pivots;
  }

  private detectHeadAndShoulders(pivotHighs: number[], data: number[]): DetectedPattern | null {
    if (pivotHighs.length < 3) return null;

    // Find three peaks that form H&S pattern
    for (let i = 0; i < pivotHighs.length - 2; i++) {
      const left = pivotHighs[i];
      const head = pivotHighs[i + 1];
      const right = pivotHighs[i + 2];

      const leftVal = data[left];
      const headVal = data[head];
      const rightVal = data[right];

      // Head must be at least 3% above shoulders
      const headHeight = (headVal - Math.max(leftVal, rightVal)) / Math.max(leftVal, rightVal);
      if (headHeight < 0.03) continue;

      // Shoulders should be similar (92%+ symmetry)
      const shoulderSymmetry = Math.min(leftVal, rightVal) / Math.max(leftVal, rightVal);
      if (shoulderSymmetry < 0.92) continue;

      // Spacing check (15+ candles between shoulders)
      const spacing = right - left;
      if (spacing < 15) continue;

      return {
        patternType: 'chart',
        patternName: 'Head & Shoulders',
        direction: 'bearish',
        confidence: 89,
        metadata: {
          pivotPoints: [left, head, right],
          symmetry: shoulderSymmetry * 100,
          spacing,
          depth: headHeight * 100,
        },
      };
    }
    return null;
  }

  private detectInverseHeadAndShoulders(pivotLows: number[], data: number[]): DetectedPattern | null {
    if (pivotLows.length < 3) return null;

    for (let i = 0; i < pivotLows.length - 2; i++) {
      const left = pivotLows[i];
      const head = pivotLows[i + 1];
      const right = pivotLows[i + 2];

      const leftVal = data[left];
      const headVal = data[head];
      const rightVal = data[right];

      const headDepth = (Math.min(leftVal, rightVal) - headVal) / Math.min(leftVal, rightVal);
      if (headDepth < 0.03) continue;

      const shoulderSymmetry = Math.max(leftVal, rightVal) / Math.min(leftVal, rightVal);
      if (shoulderSymmetry < 0.92) continue;

      const spacing = right - left;
      if (spacing < 15) continue;

      return {
        patternType: 'chart',
        patternName: 'Inverse Head & Shoulders',
        direction: 'bullish',
        confidence: 89,
        metadata: {
          pivotPoints: [left, head, right],
          symmetry: shoulderSymmetry * 100,
          spacing,
          depth: headDepth * 100,
        },
      };
    }
    return null;
  }

  private detectDoubleBottom(pivotLows: number[], data: number[]): DetectedPattern | null {
    if (pivotLows.length < 2) return null;

    for (let i = 0; i < pivotLows.length - 1; i++) {
      const first = pivotLows[i];
      const second = pivotLows[i + 1];

      const firstVal = data[first];
      const secondVal = data[second];

      const similarity = Math.min(firstVal, secondVal) / Math.max(firstVal, secondVal);
      if (similarity < 0.98) continue; // Very similar lows

      const spacing = second - first;
      if (spacing < 10) continue;

      return {
        patternType: 'chart',
        patternName: 'Double Bottom',
        direction: 'bullish',
        confidence: 78,
        metadata: {
          pivotPoints: [first, second],
          symmetry: similarity * 100,
          spacing,
        },
      };
    }
    return null;
  }

  private detectDoubleTop(pivotHighs: number[], data: number[]): DetectedPattern | null {
    if (pivotHighs.length < 2) return null;

    for (let i = 0; i < pivotHighs.length - 1; i++) {
      const first = pivotHighs[i];
      const second = pivotHighs[i + 1];

      const firstVal = data[first];
      const secondVal = data[second];

      const similarity = Math.min(firstVal, secondVal) / Math.max(firstVal, secondVal);
      if (similarity < 0.98) continue;

      const spacing = second - first;
      if (spacing < 10) continue;

      return {
        patternType: 'chart',
        patternName: 'Double Top',
        direction: 'bearish',
        confidence: 76,
        metadata: {
          pivotPoints: [first, second],
          symmetry: similarity * 100,
          spacing,
        },
      };
    }
    return null;
  }

  private detectAscendingTriangle(highs: number[], lows: number[], closes: number[]): DetectedPattern | null {
    if (highs.length < 20) return null;

    // Check for horizontal resistance and rising support
    const recentHighs = highs.slice(-10);
    const recentLows = lows.slice(-10);
    const avgHigh = recentHighs.reduce((a, b) => a + b, 0) / recentHighs.length;
    const highVariance = recentHighs.reduce((sum, h) => sum + Math.pow(h - avgHigh, 2), 0) / recentHighs.length;
    const highStdDev = Math.sqrt(highVariance);

    // Check if lows are rising
    const lowTrend = recentLows[recentLows.length - 1] - recentLows[0];
    const isRising = lowTrend > 0;

    // High resistance should be relatively flat (low variance)
    if (highStdDev / avgHigh < 0.02 && isRising) {
      return {
        patternType: 'chart',
        patternName: 'Ascending Triangle',
        direction: 'bullish',
        confidence: 76,
      };
    }
    return null;
  }

  private detectDescendingTriangle(highs: number[], lows: number[], closes: number[]): DetectedPattern | null {
    if (highs.length < 20) return null;

    const recentHighs = highs.slice(-10);
    const recentLows = lows.slice(-10);
    const avgLow = recentLows.reduce((a, b) => a + b, 0) / recentLows.length;
    const lowVariance = recentLows.reduce((sum, l) => sum + Math.pow(l - avgLow, 2), 0) / recentLows.length;
    const lowStdDev = Math.sqrt(lowVariance);

    const highTrend = recentHighs[recentHighs.length - 1] - recentHighs[0];
    const isFalling = highTrend < 0;

    if (lowStdDev / avgLow < 0.02 && isFalling) {
      return {
        patternType: 'chart',
        patternName: 'Descending Triangle',
        direction: 'bearish',
        confidence: 73,
      };
    }
    return null;
  }

  private detectCupAndHandle(data: number[], pivotLows: number[]): DetectedPattern | null {
    if (data.length < 30 || pivotLows.length < 2) return null;

    // Simplified cup & handle detection
    const midPoint = Math.floor(data.length / 2);
    const leftHalf = data.slice(0, midPoint);
    const rightHalf = data.slice(midPoint);

    const leftMin = Math.min(...leftHalf);
    const rightMin = Math.min(...rightHalf);
    const cupDepth = (Math.max(...leftHalf) - leftMin) / leftMin;

    if (cupDepth > 0.15 && cupDepth < 0.5) {
      // Check for handle (small pullback after cup)
      const handleStart = rightHalf[0];
      const handleLow = Math.min(...rightHalf.slice(0, Math.min(10, rightHalf.length)));
      const handleDepth = (handleStart - handleLow) / handleStart;

      if (handleDepth > 0.05 && handleDepth < 0.15) {
        return {
          patternType: 'chart',
          patternName: 'Cup & Handle',
          direction: 'bullish',
          confidence: 72,
        };
      }
    }
    return null;
  }

  private detectBullishFlag(data: number[], highs: number[], lows: number[]): DetectedPattern | null {
    if (data.length < 15) return null;

    // Check for strong upward move followed by consolidation
    const firstThird = data.slice(0, Math.floor(data.length / 3));
    const lastThird = data.slice(Math.floor(data.length * 2 / 3));

    const initialMove = lastThird[0] - firstThird[0];
    const consolidationRange = Math.max(...lastThird) - Math.min(...lastThird);
    const moveRatio = initialMove / Math.max(...firstThird);

    if (moveRatio > 0.1 && consolidationRange / lastThird[0] < 0.05) {
      return {
        patternType: 'chart',
        patternName: 'Bullish Flag',
        direction: 'bullish',
        confidence: 67,
      };
    }
    return null;
  }

  private detectBearishFlag(data: number[], highs: number[], lows: number[]): DetectedPattern | null {
    if (data.length < 15) return null;

    const firstThird = data.slice(0, Math.floor(data.length / 3));
    const lastThird = data.slice(Math.floor(data.length * 2 / 3));

    const initialMove = firstThird[0] - lastThird[0];
    const consolidationRange = Math.max(...lastThird) - Math.min(...lastThird);
    const moveRatio = initialMove / Math.max(...firstThird);

    if (moveRatio > 0.1 && consolidationRange / lastThird[0] < 0.05) {
      return {
        patternType: 'chart',
        patternName: 'Bearish Flag',
        direction: 'bearish',
        confidence: 67,
      };
    }
    return null;
  }
}

let patternDetectionService: PatternDetectionService | null = null;

export function getPatternDetectionService(): PatternDetectionService {
  if (!patternDetectionService) {
    patternDetectionService = new PatternDetectionService();
  }
  return patternDetectionService;
}

