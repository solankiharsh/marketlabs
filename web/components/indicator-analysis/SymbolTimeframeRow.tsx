'use client';

/**
 * Single row: Cryptocurrency (market) + BTC/USDT (symbol + watchlist) + 1m 5m … 1W (timeframes).
 * Used above Technical Indicators sidebar.
 */

import { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { TimeframeBar, type TimeframeValue } from './TimeframeBar';
import { SymbolWatchlistDropdown } from './SymbolWatchlistDropdown';
import type { WatchlistEntry } from '@/hooks/use-watchlist';

const MARKET_PILL_CLASS: Record<string, string> = {
  Crypto: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  Cryptocurrency: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  USStock: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
  Forex: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
};

export interface SymbolTimeframeRowProps {
  market: string;
  symbol: string;
  timeframe: TimeframeValue;
  onMarketChange: (m: string) => void;
  onSymbolChange: (s: string) => void;
  onTimeframeChange: (tf: TimeframeValue) => void;
  entries: WatchlistEntry[];
  getPrice: (market: string, symbol: string) => number | undefined;
  onAddClick?: () => void;
  dark?: boolean;
}

export function SymbolTimeframeRow({
  market,
  symbol,
  timeframe,
  onMarketChange,
  onSymbolChange,
  onTimeframeChange,
  entries,
  getPrice,
  onAddClick,
  dark = true,
}: SymbolTimeframeRowProps) {
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const symbolButtonRef = useRef<HTMLButtonElement>(null);
  const marketPillClass = MARKET_PILL_CLASS[market] ?? 'bg-[#2A3040] text-[#9CA3AF] border-[#2A3040]';

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <span className={`px-2 py-1 text-xs font-medium rounded-md border shrink-0 ${marketPillClass}`}>
        {market === 'Crypto' ? 'Cryptocurrency' : market}
      </span>
      <button
        ref={symbolButtonRef}
        type="button"
        onClick={() => setWatchlistOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-[#2A3040] bg-[#181C25] px-3 py-2 text-sm text-[#F5F5F5] hover:bg-[#1E2330] min-h-[40px] shrink-0"
        aria-label="Select symbol"
      >
        <span className="font-medium">{symbol}</span>
        <Search className="w-4 h-4 text-[#6B7280]" />
      </button>
      <SymbolWatchlistDropdown
        open={watchlistOpen}
        onClose={() => setWatchlistOpen(false)}
        anchorRef={symbolButtonRef}
        entries={entries}
        getPrice={getPrice ?? (() => undefined)}
        activeMarket={market}
        activeSymbol={symbol}
        onSelect={(m, s) => {
          onMarketChange(m);
          onSymbolChange(s);
          setWatchlistOpen(false);
        }}
        onAddClick={() => {
          setWatchlistOpen(false);
          onAddClick?.();
        }}
      />
      <TimeframeBar value={timeframe} onChange={onTimeframeChange} dark={dark} />
    </div>
  );
}
