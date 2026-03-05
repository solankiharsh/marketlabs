'use client';

import type { OHLCVCandle } from '@/lib/api';

interface OHLCVBarProps {
  candle: OHLCVCandle | null;
}

function formatNum(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function OHLCVBar({ candle }: OHLCVBarProps) {
  if (!candle) {
    return (
      <div className="text-xs text-text-muted font-mono tabular-nums py-1">
        Hover over the chart to see OHLCV
      </div>
    );
  }
  const timeStr = new Date(candle.time >= 1e12 ? candle.time : candle.time * 1000).toLocaleString();
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-text-secondary py-1 border-b border-border/50">
      <span>Time: {timeStr}</span>
      <span>Open: {candle.open.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
      <span>High: {candle.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
      <span>Low: {candle.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
      <span>Close: {candle.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
      <span>Volume: {candle.volume != null ? formatNum(candle.volume) : '—'}</span>
    </div>
  );
}
