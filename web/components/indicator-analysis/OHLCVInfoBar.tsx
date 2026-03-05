'use client';

/**
 * OHLCV info bar for ChartSection — shows crosshair candle or placeholder.
 * Format: Time: 2026-03-04, 8:00:00 AM   Open: ...   High: ...   Low: ...   Close: ...   Volume: ...
 */

import type { KLineData } from 'klinecharts';

export interface OHLCVInfoBarProps {
  /** Current candle under crosshair, or null when not hovering */
  candle: KLineData | null;
}

function formatNum(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function OHLCVInfoBar({ candle }: OHLCVInfoBarProps) {
  if (!candle) {
    return (
      <div className="text-xs text-[#6B7280] font-mono tabular-nums py-1.5 border-b border-[#2A3040]">
        Hover over the chart to see OHLCV
      </div>
    );
  }
  const timeStr = new Date(candle.timestamp).toLocaleString();
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-[#10B981] py-1.5 border-b border-[#2A3040]">
      <span>Time: {timeStr}</span>
      <span>Open: {candle.open.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
      <span>High: {candle.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
      <span>Low: {candle.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
      <span>Close: {candle.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
      <span>Volume: {candle.volume != null ? formatNum(candle.volume) : '—'}</span>
    </div>
  );
}
