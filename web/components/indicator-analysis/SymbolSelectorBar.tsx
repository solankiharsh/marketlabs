'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Zap } from 'lucide-react';
import { getMarketTypes, searchSymbols, getLatestPrice } from '@/lib/api';
import { SymbolWatchlistDropdown } from './SymbolWatchlistDropdown';
import type { WatchlistEntry } from '@/hooks/use-watchlist';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'] as const;
type TimeframeOption = (typeof TIMEFRAMES)[number];

interface SymbolSelectorBarProps {
  market: string;
  symbol: string;
  timeframe: string;
  onMarketChange: (m: string) => void;
  onSymbolChange: (s: string) => void;
  onTimeframeChange: (t: string) => void;
  onQuickTradeClick: () => void;
  /** Watchlist: when provided, market badge opens dropdown and search opens Add modal */
  watchlistEntries?: WatchlistEntry[];
  getWatchlistPrice?: (market: string, symbol: string) => number | undefined;
  onAddToWatchlistClick?: () => void;
  /** When false, price is fetched once; when true, polled every 10s (realtime) */
  realtimeUpdates?: boolean;
}

const MARKET_PILL_CLASS: Record<string, string> = {
  Forex: 'border-green-500/50 text-green-600',
  Cryptocurrency: 'border-amber-500/50 text-amber-600',
  USStock: 'border-cyan-500/50 text-cyan-600',
  Crypto: 'border-amber-500/50 text-amber-600',
  Futures: 'border-purple-500/50 text-purple-600',
};

const MARKET_DISPLAY_LABEL: Record<string, string> = {
  Crypto: 'Crypto',
  Cryptocurrency: 'Crypto',
  Forex: 'Forex',
  USStock: 'US Stock',
  Futures: 'Futures',
};

/** Always show a friendly label (Crypto, Forex, US Stock); never show i18n keys like dashboard.analysis.market.Crypto */
function marketDisplayLabel(marketValue: string, i18nKey?: string | null): string {
  if (i18nKey && typeof i18nKey === 'string' && !i18nKey.includes('.')) return i18nKey;
  return MARKET_DISPLAY_LABEL[marketValue] ?? marketValue;
}

function marketPillClass(m: string): string {
  return MARKET_PILL_CLASS[m] ?? 'border-border text-text-secondary';
}

export function SymbolSelectorBar({
  market,
  symbol,
  timeframe,
  onMarketChange,
  onSymbolChange,
  onTimeframeChange,
  onQuickTradeClick,
  watchlistEntries = [],
  getWatchlistPrice,
  onAddToWatchlistClick,
  realtimeUpdates = true,
}: SymbolSelectorBarProps) {
  const [markets, setMarkets] = useState<{ value: string; i18nKey: string }[]>([]);
  const [searchKeyword, setSearchKeyword] = useState(symbol);
  const [searchOpen, setSearchOpen] = useState(false);
  const [watchlistDropdownOpen, setWatchlistDropdownOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<{ symbol: string; name?: string; market?: string }[]>([]);
  const [priceData, setPriceData] = useState<{ price?: number; change?: number; changePercent?: number } | null>(null);
  const symbolNameRef = useRef<string | null>(null);

  useEffect(() => {
    getMarketTypes()
      .then((list) => setMarkets(list.map((x) => ({ value: x.value, i18nKey: x.i18nKey }))))
      .catch(() => setMarkets([{ value: 'Crypto', i18nKey: 'Crypto' }, { value: 'Forex', i18nKey: 'Forex' }, { value: 'USStock', i18nKey: 'Stocks' }]));
  }, []);

  useEffect(() => {
    if (!market || !symbol) return;
    getLatestPrice(market, symbol)
      .then((d) => {
        const data = d as { price?: number; change?: number; changePercent?: number; close?: number };
        const price = data.price ?? data.close;
        setPriceData({
          price,
          change: data.change,
          changePercent: data.changePercent ?? data.change,
        });
      })
      .catch(() => setPriceData(null));
    if (!realtimeUpdates) return;
    const t = setInterval(() => {
      getLatestPrice(market, symbol)
        .then((d) => {
          const data = d as { price?: number; change?: number; changePercent?: number; close?: number };
          const price = data.price ?? data.close;
          setPriceData({
            price,
            change: data.change,
            changePercent: data.changePercent ?? data.change,
          });
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, [market, symbol, realtimeUpdates]);

  const doSearch = useCallback(() => {
    const q = (searchKeyword || symbol).trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    searchSymbols(market, q, 15)
      .then((list) => setSearchResults(list.map((x) => ({ symbol: x.symbol ?? '', name: x.name, market: x.market }))))
      .catch(() => setSearchResults([]));
  }, [market, symbol, searchKeyword]);

  useEffect(() => {
    if (!searchOpen) return;
    doSearch();
  }, [searchOpen, searchKeyword, doSearch]);

  const price = priceData?.price ?? 0;
  const changePct = priceData?.changePercent ?? 0;
  const isPositive = changePct >= 0;

  const symbolDisplayName = watchlistEntries.find((e) => e.market === market && e.symbol === symbol)?.name ?? symbolNameRef.current ?? symbol;
  const showWatchlist = watchlistEntries.length > 0 || onAddToWatchlistClick;

  return (
    <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 relative" ref={anchorRef}>
        {showWatchlist ? (
          <>
            <button
              type="button"
              onClick={() => setWatchlistDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated"
            >
              <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs border ${marketPillClass(market)}`}>
                {marketDisplayLabel(market, markets.find((m) => m.value === market)?.i18nKey)}
              </span>
              <span className="font-semibold">{symbol}</span>
              <span className="text-text-muted truncate max-w-[120px]">{symbolDisplayName}</span>
            </button>
            <button
              type="button"
              onClick={() => (onAddToWatchlistClick ? onAddToWatchlistClick() : setSearchOpen(true))}
              className="p-2 rounded-lg border border-border text-text-muted hover:bg-bg-elevated hover:text-text-primary"
              aria-label="Search or add to watchlist"
            >
              <Search className="w-4 h-4" />
            </button>
            <SymbolWatchlistDropdown
              open={watchlistDropdownOpen}
              onClose={() => setWatchlistDropdownOpen(false)}
              anchorRef={anchorRef}
              entries={watchlistEntries}
              getPrice={getWatchlistPrice ?? (() => undefined)}
              activeMarket={market}
              activeSymbol={symbol}
              onSelect={(m, s) => {
                onMarketChange(m);
                onSymbolChange(s);
                setSearchKeyword(s);
                setWatchlistDropdownOpen(false);
              }}
              onAddClick={() => {
                setWatchlistDropdownOpen(false);
                onAddToWatchlistClick?.();
              }}
            />
          </>
        ) : (
          <>
            <select
              value={market}
              onChange={(e) => onMarketChange(e.target.value)}
              className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary"
            >
              {markets.map((m) => (
                <option key={m.value} value={m.value}>
                  {marketDisplayLabel(m.value, m.i18nKey)}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                placeholder={`${symbol} search`}
                className="pl-8 pr-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm w-36"
              />
              {searchOpen && searchResults.length > 0 && (
                <ul className="absolute top-full left-0 mt-1 w-56 max-h-48 overflow-auto rounded-lg border border-border bg-bg-primary shadow-lg z-10">
                  {searchResults.map((r) => (
                    <li key={r.symbol}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-bg-elevated text-text-primary"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onSymbolChange(r.symbol);
                          setSearchKeyword(r.symbol);
                          symbolNameRef.current = r.name ?? null;
                          setSearchOpen(false);
                        }}
                      >
                        {r.symbol} {r.name ? `(${r.name})` : ''}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => onTimeframeChange(tf)}
            className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
              timeframe === tf
                ? 'bg-accent-primary/20 text-accent-primary border-accent-primary/40'
                : 'border-border text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-semibold text-text-primary">{symbol}</div>
          <div className="text-xs text-text-muted">{marketDisplayLabel(market, markets.find((m) => m.value === market)?.i18nKey)}</div>
          <div className="text-lg font-bold tabular-nums text-text-primary">{price > 0 ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</div>
          <div className={`text-sm font-medium tabular-nums ${isPositive ? 'text-success' : 'text-error'}`}>
            {price > 0 ? `${isPositive ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
          </div>
        </div>
        <button
          type="button"
          onClick={onQuickTradeClick}
          aria-label="Quick Trade"
          title="Quick Trade"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-teal-500 via-cyan-500 to-purple-600 text-white font-medium text-sm px-4 py-2.5 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-bg-primary"
        >
          <Zap className="w-4 h-4 stroke-[2.5]" fill="currentColor" />
          Quick Trade
        </button>
      </div>
    </div>
  );
}
