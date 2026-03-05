'use client';

/**
 * Right sidebar for ChartSection — symbol, market, price, change %, Quick Trade button.
 */

import { Zap } from 'lucide-react';

export interface PriceDisplayProps {
  symbol: string;
  market: string;
  price: number | undefined;
  changePercent: number | undefined;
  onQuickTrade: () => void;
  dark?: boolean;
}

export function PriceDisplay({
  symbol,
  market,
  price,
  changePercent,
  onQuickTrade,
  dark = true,
}: PriceDisplayProps) {
  const isPositive = changePercent != null && changePercent >= 0;
  const priceStr =
    price != null
      ? price >= 1000
        ? price.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      : '—';
  const changeStr =
    changePercent != null
      ? `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`
      : '—';

  return (
    <div
      className={`w-52 shrink-0 rounded-lg border p-4 flex flex-col gap-3 ${
        dark ? 'border-[#2A3040] bg-[#181C25]' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="font-semibold text-[#F5F5F5] truncate">{symbol}</div>
      <div className="text-xs text-[#6B7280]">{market}</div>
      <div className="text-xl font-bold text-[#F5F5F5] tabular-nums">{priceStr}</div>
      <div
        className={`text-sm font-medium tabular-nums ${
          isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'
        }`}
      >
        {changeStr}
      </div>
      <button
        type="button"
        onClick={onQuickTrade}
        className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg font-medium text-sm transition-colors ${
          dark
            ? 'bg-[#D4A843] text-[#0F1117] hover:bg-[#c49b3c]'
            : 'bg-[#2DD4A8] text-white hover:bg-[#26B891]'
        }`}
      >
        <Zap className="w-4 h-4" />
        Quick Trade
      </button>
    </div>
  );
}
