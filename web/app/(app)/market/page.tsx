'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import {
  getMarketTypes,
  getHotSymbols,
  getWatchlist,
  getWatchlistPrices,
  removeFromWatchlist,
  searchSymbols,
  type MarketType,
  type SymbolSearchItem,
  type WatchlistItem,
  type WatchlistPriceItem,
} from '@/lib/api';
import { toast } from 'sonner';

export default function MarketsPage() {
  const [marketTypes, setMarketTypes] = useState<MarketType[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>('Crypto');
  const [hotSymbols, setHotSymbols] = useState<SymbolSearchItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistPrices, setWatchlistPrices] = useState<Record<string, WatchlistPriceItem>>({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingHot, setLoadingHot] = useState(true);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);

  useEffect(() => {
    getMarketTypes()
      .then((types) => {
        setMarketTypes(types);
        if (types.length > 0 && !selectedMarket) {
          setSelectedMarket(types[0].value);
        }
      })
      .catch(() => setMarketTypes([]));
  }, []);

  useEffect(() => {
    if (!selectedMarket) return;
    setLoadingHot(true);
    getHotSymbols(selectedMarket, 12)
      .then(setHotSymbols)
      .catch(() => setHotSymbols([]))
      .finally(() => setLoadingHot(false));
  }, [selectedMarket]);

  const loadWatchlist = () => {
    setLoadingWatchlist(true);
    getWatchlist()
      .then((list) => {
        setWatchlist(list);
        if (list.length === 0) {
          setWatchlistPrices({});
          setLoadingWatchlist(false);
          return;
        }
        const payload = list.map((w) => ({ market: w.market, symbol: w.symbol }));
        return getWatchlistPrices(payload).then((prices) => {
          const map: Record<string, WatchlistPriceItem> = {};
          prices.forEach((p) => {
            const key = `${p.market}:${p.symbol}`;
            map[key] = p;
          });
          setWatchlistPrices(map);
        });
      })
      .catch(() => {
        setWatchlist([]);
        setWatchlistPrices({});
      })
      .finally(() => setLoadingWatchlist(false));
  };

  useEffect(() => {
    loadWatchlist();
    const t = setInterval(loadWatchlist, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim() || !selectedMarket) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      searchSymbols(selectedMarket, searchKeyword, 10)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword, selectedMarket]);

  const handleRemoveWatchlist = async (market: string, symbol: string) => {
    try {
      await removeFromWatchlist(market, symbol);
      toast.success('Removed from watchlist');
      loadWatchlist();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove');
    }
  };

  const priceKey = (m: string, s: string) => `${m}:${s}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2">Market Command Centre</h2>
        <p className="text-sm sm:text-base text-text-muted">
          Search symbols, track hot markets, and manage your watchlist.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-3">Symbol search</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden bg-bg-secondary flex-1">
            <span className="flex items-center pl-3 text-text-muted">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search by symbol or name..."
              className="flex-1 min-w-0 px-3 py-2.5 bg-transparent text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {marketTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setSelectedMarket(t.value)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedMarket === t.value
                    ? 'bg-accent-primary/20 border-accent-primary/40 text-accent-primary'
                    : 'border-border bg-bg-secondary text-text-secondary hover:bg-bg-elevated'
                }`}
              >
                {t.value}
              </button>
            ))}
          </div>
        </div>
        {searching && (
          <p className="mt-2 text-sm text-text-muted">Searching...</p>
        )}
        {searchResults.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {searchResults.map((s, i) => (
              <Link
                key={`${s.market ?? selectedMarket}:${s.symbol}:${i}`}
                href={`/market/${encodeURIComponent((s.symbol ?? '').replace('/', '-'))}?market=${encodeURIComponent(s.market ?? selectedMarket)}`}
                className="px-3 py-1.5 rounded-lg border border-border bg-bg-secondary text-text-primary hover:border-accent-primary/40 text-sm"
              >
                {s.name || s.symbol} ({s.symbol})
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Hot symbols — {selectedMarket}</h3>
        {loadingHot ? (
          <p className="text-text-muted text-sm">Loading...</p>
        ) : hotSymbols.length === 0 ? (
          <p className="text-text-muted text-sm">No hot symbols for this market.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {hotSymbols.map((s, i) => (
              <Link
                key={`${s.market ?? selectedMarket}:${s.symbol}:${i}`}
                href={`/market/${encodeURIComponent((s.symbol ?? '').replace('/', '-'))}?market=${encodeURIComponent(s.market ?? selectedMarket)}`}
                className="p-4 rounded-lg border border-border bg-bg-secondary hover:border-accent-primary/30 transition-colors"
              >
                <div className="font-medium text-text-primary">{s.name || s.symbol}</div>
                <div className="text-sm text-text-muted">{s.symbol}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Watchlist</h3>
        {loadingWatchlist ? (
          <p className="text-text-muted text-sm">Loading...</p>
        ) : watchlist.length === 0 ? (
          <p className="text-text-muted text-sm">
            Your watchlist is empty. Open a symbol and add it to your watchlist from the asset page.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="pb-2 pr-4">Symbol</th>
                  <th className="pb-2 pr-4">Market</th>
                  <th className="pb-2 pr-4">Price</th>
                  <th className="pb-2 w-20" />
                </tr>
              </thead>
              <tbody>
                {watchlist.map((w) => {
                  const priceData = watchlistPrices[priceKey(w.market, w.symbol)];
                  const price = priceData?.price ?? priceData?.close;
                  return (
                    <tr key={w.id} className="border-b border-border/50">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/market/${encodeURIComponent(w.symbol.replace('/', '-'))}?market=${encodeURIComponent(w.market)}`}
                          className="text-accent-primary hover:text-accent-soft font-medium"
                        >
                          {w.name || w.symbol}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-text-secondary">{w.market}</td>
                      <td className="py-3 pr-4 text-text-primary">
                        {typeof price === 'number' ? price.toLocaleString() : '—'}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleRemoveWatchlist(w.market, w.symbol)}
                          className="text-text-muted hover:text-error text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
