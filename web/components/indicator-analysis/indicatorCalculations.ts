/**
 * Client-side technical indicator calculations from OHLCV data.
 * Used when no backend /api/technical endpoint is available.
 */

import type { OHLCVCandle } from '@/lib/api';

export function sma(data: OHLCVCandle[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
      out.push(sum / period);
    }
  }
  return out;
}

export function ema(data: OHLCVCandle[], period: number): number[] {
  const out: number[] = [];
  const k = 2 / (period + 1);
  if (data.length < period) return data.map(() => NaN);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  const first = sum / period;
  out.push(first);
  for (let i = period; i < data.length; i++) {
    const v = (data[i].close - out[out.length - 1]) * k + out[out.length - 1];
    out.push(v);
  }
  const padded = new Array(period - 1).fill(NaN);
  return [...padded, ...out];
}

export function bbands(data: OHLCVCandle[], period: number, mult: number = 2): { upper: number[]; middle: number[]; lower: number[] } {
  const mid = sma(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      let sumSq = 0;
      for (let j = i - period + 1; j <= i; j++) sumSq += (data[j].close - mid[i]) ** 2;
      const std = Math.sqrt(sumSq / period) || 0;
      upper.push(mid[i] + mult * std);
      lower.push(mid[i] - mult * std);
    }
  }
  return { upper, middle: mid, lower };
}

export function rsi(data: OHLCVCandle[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      out.push(NaN);
      continue;
    }
    let gain = 0;
    let loss = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const delta = j === 0 ? 0 : data[j].close - data[j - 1].close;
      if (delta > 0) gain += delta;
      else loss -= delta;
    }
    const avgl = loss / period;
    if (avgl === 0) {
      out.push(100);
    } else {
      const rs = (gain / period) / avgl;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

export function atr(data: OHLCVCandle[], period: number): number[] {
  const out: number[] = [];
  const tr: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
    } else {
      const h = data[i].high;
      const l = data[i].low;
      const prevC = data[i - 1].close;
      tr.push(Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC)));
    }
  }
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += tr[j];
      out.push(sum / period);
    }
  }
  return out;
}

export function macd(
  data: OHLCVCandle[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): { macd: number[]; signal: number[]; hist: number[] } {
  const emaFast = ema(data, fast);
  const emaSlow = ema(data, slow);
  const macdLine: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (isNaN(emaFast[i]) || isNaN(emaSlow[i])) macdLine.push(NaN);
    else macdLine.push(emaFast[i] - emaSlow[i]);
  }
  const signalLine: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (i < signal - 1) {
      signalLine.push(NaN);
    } else {
      let sum = 0;
      for (let j = i - signal + 1; j <= i; j++) if (!isNaN(macdLine[j])) sum += macdLine[j];
      signalLine.push(sum / signal);
    }
  }
  const hist: number[] = macdLine.map((m, i) => (isNaN(m) || isNaN(signalLine[i]) ? NaN : m - signalLine[i]));
  return { macd: macdLine, signal: signalLine, hist };
}
