'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getMarketSentiment, getGlobalOverview, refreshGlobalData } from '@/lib/api';
import { toast } from 'sonner';

interface IndexItem {
  symbol?: string;
  name_en?: string;
  name_cn?: string;
  price?: number;
  change?: number;
  region?: string;
  flag?: string;
  category?: string;
}

export function MarketIndicesTicker() {
  const [sentiment, setSentiment] = useState<Record<string, unknown>>({});
  const [overview, setOverview] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const [sent, ov] = await Promise.all([
        getMarketSentiment(),
        getGlobalOverview(),
      ]);
      setSentiment(sent);
      setOverview(ov);
      if (force) {
        await refreshGlobalData();
        toast.success('Market data refreshed');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load ticker');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fearGreed = sentiment.fear_greed as Record<string, unknown> | undefined;
  const vix = sentiment.vix as Record<string, unknown> | undefined;
  const dxy = sentiment.dxy as Record<string, unknown> | undefined;

  const fgVal = typeof fearGreed?.value === 'number' ? fearGreed.value : 50;
  const vixVal = typeof vix?.value === 'number' ? vix.value : 0;
  const dxyVal = typeof dxy?.value === 'number' ? dxy.value : 0;

  const indices = (overview.indices as IndexItem[] | undefined) ?? [];

  const tickerItems = [...indices, ...indices];

  return (
    <div className="flex items-center gap-0 rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center flex-shrink-0 gap-1 border-r border-border bg-bg-secondary px-3 py-2">
        <div className="px-2 py-1 rounded bg-bg-elevated">
          <span className="text-[10px] font-medium text-text-muted uppercase">F&G</span>
          <span
            className={`ml-1 font-mono text-sm font-semibold tabular-nums ${
              fgVal <= 25 ? 'text-red-400' : fgVal >= 75 ? 'text-green-400' : 'text-text-primary'
            }`}
          >
            {fgVal}
          </span>
        </div>
        <div className="px-2 py-1 rounded bg-bg-elevated">
          <span className="text-[10px] font-medium text-text-muted uppercase">VIX</span>
          <span
            className={`ml-1 font-mono text-sm font-semibold tabular-nums ${
              (vixVal as number) >= 20 ? 'text-red-400' : 'text-text-primary'
            }`}
          >
            {(vixVal as number).toFixed(2)}
          </span>
        </div>
        <div className="px-2 py-1 rounded bg-bg-elevated">
          <span className="text-[10px] font-medium text-text-muted uppercase">DXY</span>
          <span className="ml-1 font-mono text-sm font-semibold tabular-nums text-text-primary">
            {(dxyVal as number).toFixed(2)}
          </span>
        </div>
      </div>

      <div
        className="flex-1 min-w-0 overflow-hidden py-2"
        style={{ maskImage: 'linear-gradient(to right, transparent, black 1%, black 99%, transparent)' }}
      >
        {loading && indices.length === 0 ? (
          <div className="flex items-center justify-center h-8 text-text-muted text-xs">
            Loading...
          </div>
        ) : (
          <div
            className="flex w-max gap-4 pl-4 items-center"
            style={{ animation: 'marquee-scroll 45s linear infinite' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.animationPlayState = 'paused';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.animationPlayState = 'running';
            }}
          >
            {tickerItems.map((item, i) => {
              const ch = typeof item.change === 'number' ? item.change : 0;
              const isUp = ch >= 0;
              const price = item.price ?? 0;
              const sym = (item.symbol ?? '').replace(/^\^/, '');
              const displayPrice =
                price >= 1000
                  ? `${(price / 1000).toFixed(1)}K`
                  : price >= 1
                    ? price.toFixed(2)
                    : price.toFixed(4);
              return (
                <span
                  key={`${sym}-${i}`}
                  className="flex-shrink-0 flex items-center gap-1 text-xs font-mono tabular-nums whitespace-nowrap"
                >
                  <span className={isUp ? 'text-green-400' : 'text-red-400'}>
                    {isUp ? '▲' : '▼'}
                  </span>
                  <span className="text-text-muted">{item.flag ?? ''}</span>
                  <span className="text-text-primary font-medium">{sym}</span>
                  <span className="text-text-secondary">{displayPrice}</span>
                  <span className={isUp ? 'text-green-400' : 'text-red-400'}>
                    {isUp ? '+' : ''}
                    {ch.toFixed(2)}%
                  </span>
                  <span className="text-text-muted/50">•</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => load(true)}
        disabled={refreshing}
        className="flex-shrink-0 p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-50"
        aria-label="Refresh"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
