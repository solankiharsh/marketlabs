'use client';

import { useEffect, useState } from 'react';
import { Star, Plus } from 'lucide-react';
import { getWatchlist, getWatchlistPrices, addToWatchlist, type WatchlistItem, type WatchlistPriceItem } from '@/lib/api';
import { SelectSymbolModal } from '@/components/ai-analysis/SelectSymbolModal';
import { toast } from 'sonner';

interface WatchlistPanelProps {
  onSelectSymbol?: (market: string, symbol: string) => void;
}

export function WatchlistPanel({ onSelectSymbol }: WatchlistPanelProps) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<Record<string, WatchlistPriceItem>>({});
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    getWatchlist()
      .then((list) => {
        setWatchlist(list);
        if (list.length === 0) {
          setPrices({});
          setLoading(false);
          return;
        }
        const payload = list.map((w) => ({ market: w.market, symbol: w.symbol }));
        return getWatchlistPrices(payload);
      })
      .then((priceList) => {
        const map: Record<string, WatchlistPriceItem> = {};
        (priceList ?? []).forEach((p) => {
          map[`${p.market}:${p.symbol}`] = p;
        });
        setPrices(map);
      })
      .catch(() => {
        setWatchlist([]);
        setPrices({});
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const priceKey = (m: string, s: string) => `${m}:${s}`;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Star className="w-4 h-4 text-accent-primary" />
          My Watchlist
        </h3>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="p-1.5 rounded-lg border border-border bg-bg-secondary hover:bg-bg-elevated text-text-primary"
          aria-label="Add to watchlist"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-80 overflow-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-bg-elevated animate-pulse" />
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <p className="p-4 text-sm text-text-muted text-center">
            Your watchlist is empty. Click + to add symbols.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {watchlist.map((w) => {
              const priceData = prices[priceKey(w.market, w.symbol)];
              const price = priceData?.price ?? (priceData as WatchlistPriceItem & { close?: number })?.close;
              const change = (priceData as WatchlistPriceItem & { changePercent?: number })?.changePercent;
              const isPositive = typeof change === 'number' && change >= 0;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSymbol?.(w.market, w.symbol)}
                    className="w-full text-left p-3 hover:bg-bg-elevated transition-colors flex flex-col gap-0.5"
                  >
                    <div className="font-medium text-text-primary">
                      {w.symbol}
                      {w.name && w.name !== w.symbol && (
                        <span className="text-text-muted font-normal ml-1 text-xs">{w.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono tabular-nums text-text-primary">
                        {typeof price === 'number'
                          ? price >= 1000
                            ? `${(price / 1000).toFixed(1)}K`
                            : price.toLocaleString(undefined, { maximumFractionDigits: 4 })
                          : '—'}
                      </span>
                      {typeof change === 'number' && (
                        <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
                          {isPositive ? '+' : ''}
                          {change.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SelectSymbolModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSelect={async (market, symbol, name) => {
          try {
            await addToWatchlist(market, symbol, name);
            toast.success('Added to watchlist');
            load();
            setAddModalOpen(false);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to add to watchlist');
          }
        }}
        title="Add to Watchlist"
        submitLabel="Add"
      />
    </div>
  );
}
