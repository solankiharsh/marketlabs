'use client';

/**
 * Inline price display (no box): "BTC/USDT Crypto 73170.00 +0.05%" with Quick Trade button.
 */

import { Zap } from 'lucide-react';

export interface PriceInlineProps {
  symbol: string;
  market: string;
  price: number | undefined;
  changePercent: number | undefined;
  onQuickTrade: () => void;
  dark?: boolean;
}

export function PriceInline({
  symbol,
  market,
  price,
  changePercent,
  onQuickTrade,
  dark = true,
}: PriceInlineProps) {
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
  const marketLabel = market === 'Crypto' ? 'Crypto' : market;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-[#F5F5F5] tabular-nums">
        <span className="font-medium">{symbol}</span>
        {' '}
        <span className="text-[#6B7280]">{marketLabel}</span>
        {' '}
        <span className="font-semibold text-[#F5F5F5]">{priceStr}</span>
        {' '}
        <span className={isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}>
          {changeStr}
        </span>
      </span>
      <button
        type="button"
        onClick={onQuickTrade}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors shrink-0 ${
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
