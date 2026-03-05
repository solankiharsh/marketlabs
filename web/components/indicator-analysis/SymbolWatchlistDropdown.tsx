'use client';

import { useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import type { WatchlistEntry } from '@/hooks/use-watchlist';

interface SymbolWatchlistDropdownProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  entries: WatchlistEntry[];
  getPrice: (market: string, symbol: string) => number | undefined;
  activeMarket: string;
  activeSymbol: string;
  onSelect: (market: string, symbol: string) => void;
  onAddClick: () => void;
}

const MARKET_PILL_CLASS: Record<string, string> = {
  Forex: 'border-green-500/50 text-green-600',
  Cryptocurrency: 'border-amber-500/50 text-amber-600',
  USStock: 'border-cyan-500/50 text-cyan-600',
  Futures: 'border-purple-500/50 text-purple-600',
};

function marketPillClass(market: string): string {
  return MARKET_PILL_CLASS[market] ?? 'border-border text-text-secondary';
}

export function SymbolWatchlistDropdown({
  open,
  onClose,
  anchorRef,
  entries,
  getPrice,
  activeMarket,
  activeSymbol,
  onSelect,
  onAddClick,
}: SymbolWatchlistDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const el = ref.current;
      const anchor = anchorRef.current;
      if (el?.contains(e.target as Node) || anchor?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 z-50 min-w-[280px] rounded-lg border border-border bg-card shadow-lg py-2"
    >
      {entries.length === 0 ? (
        <div className="px-3 py-4 text-sm text-text-muted">No symbols in watchlist</div>
      ) : (
        <ul className="max-h-64 overflow-auto">
          {entries.map((e) => {
            const isActive = e.market === activeMarket && e.symbol === activeSymbol;
            const price = getPrice(e.market, e.symbol);
            return (
              <li key={`${e.market}:${e.symbol}`}>
                <button
                  type="button"
                  onClick={() => onSelect(e.market, e.symbol)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    isActive ? 'bg-accent-primary/10' : 'hover:bg-bg-elevated'
                  }`}
                >
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs border ${marketPillClass(e.market)}`}>
                    {e.market}
                  </span>
                  <span className="font-medium text-text-primary truncate">{e.symbol}</span>
                  <span className="truncate text-text-muted text-xs flex-1">{e.name ?? ''}</span>
                  {price != null && (
                    <span className="text-xs tabular-nums text-text-secondary shrink-0">
                      {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-border mt-2 pt-2 px-3">
        <button
          type="button"
          onClick={onAddClick}
          className="flex items-center gap-2 text-sm text-accent-primary hover:underline w-full"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
    </div>
  );
}
