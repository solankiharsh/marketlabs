'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Sparkles, RefreshCw } from 'lucide-react';
import { getOpportunities, refreshGlobalData, type Opportunity } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';

export interface OpportunityRadarProps {
  /** When provided, "Analyze" runs in-page analysis and does not navigate to /market */
  onAnalyze?: (market: string, symbol: string) => void;
}

function opportunityTrendLabel(opp: Opportunity): string {
  const s = opp.signal ?? '';
  const i = opp.impact ?? '';
  if (s === 'oversold' || i === 'bullish') return 'Bullish';
  if (s === 'overbought' || i === 'bearish') return 'Bearish';
  if (s === 'bullish_momentum') return 'Bullish';
  if (s === 'bearish_momentum') return 'Bearish';
  if (s === 'prediction_opportunity') return i === 'bullish' ? 'Bullish' : 'Bearish';
  return i === 'bullish' ? 'Bullish' : i === 'bearish' ? 'Bearish' : 'Neutral';
}

function opportunityBadgeVariant(opp: Opportunity): 'success' | 'error' | 'warning' | 'default' | 'muted' {
  const label = opportunityTrendLabel(opp);
  if (label === 'Bullish') return 'success';
  if (label === 'Bearish') return 'error';
  const s = opp.signal ?? '';
  if (s === 'overbought' || s === 'oversold') return 'warning';
  return 'muted';
}

function marketRoute(opp: Opportunity): string {
  const market = opp.market === 'USStock' ? 'USStock' : opp.market === 'Forex' ? 'Forex' : 'Crypto';
  const sym = (opp.symbol ?? '').replace(/\//g, '-');
  return `/indicator-analysis?symbol=${encodeURIComponent(opp.symbol ?? '')}&market=${encodeURIComponent(market)}`;
}

function assetTypeBadgeVariant(opp: Opportunity): 'success' | 'default' | 'muted' {
  if (opp.market === 'Crypto') return 'success';
  if (opp.market === 'USStock') return 'default';
  return 'muted';
}

function assetTypeLabel(opp: Opportunity): string {
  if (opp.market === 'USStock') return 'US Stock';
  if (opp.market === 'Forex') return 'Forex';
  return 'Crypto';
}

/** English-only description for the card. Never use opp.reason (may be Chinese). */
function getOpportunityDescription(opp: Opportunity): string | null {
  const en = (opp.reason_en ?? '').trim();
  if (en) return en;
  const change = opp.change_24h ?? 0;
  const isPositive = change >= 0;
  const label = opportunityTrendLabel(opp);
  const prefix = opp.market === 'USStock' ? 'Day' : '24h';
  const pct = `${isPositive ? '+' : ''}${typeof change === 'number' ? change.toFixed(1) : '0'}%`;
  if (label === 'Bullish') return `${prefix} ${pct}, strong bullish momentum`;
  if (label === 'Bearish') return `${prefix} ${pct}, strong bearish momentum`;
  return `${prefix} ${pct}`;
}

export function OpportunityRadar({ onAnalyze }: OpportunityRadarProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getOpportunities(force);
      setOpportunities(data);
      if (force) {
        await refreshGlobalData();
        toast.success('Opportunities refreshed');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load opportunities');
      setOpportunities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const list = opportunities.length > 0 ? opportunities : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-primary" />
          AI Opportunity Radar
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Updates hourly</span>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-bg-elevated text-text-primary text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && list.length === 0 ? (
        <div className="h-32 flex items-center justify-center rounded-lg border border-border bg-card text-text-muted text-sm">
          Loading opportunities...
        </div>
      ) : list.length === 0 ? (
        <div className="h-32 flex items-center justify-center rounded-lg border border-border bg-card text-text-muted text-sm">
          No opportunities right now. Try refreshing later.
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-lg border border-border bg-card py-3 group/marquee"
          style={{ maskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)' }}
        >
          <div
            className="flex w-max gap-4 pr-4"
            style={{
              animation: 'marquee-scroll 35s linear infinite',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.animationPlayState = 'paused';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.animationPlayState = 'running';
            }}
          >
            {[...list, ...list].map((opp, i) => {
              const href = marketRoute(opp);
              const market = opp.market === 'USStock' ? 'USStock' : opp.market === 'Forex' ? 'Forex' : 'Crypto';
              const change = opp.change_24h ?? 0;
              const isPositive = change >= 0;
              const reasonText = getOpportunityDescription(opp);
              return (
                <div
                  key={`${opp.market ?? ''}-${opp.symbol ?? ''}-${i}`}
                  className="flex-shrink-0 w-[200px] rounded-lg border border-border bg-bg-secondary p-3 flex flex-col gap-2 hover:border-accent-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <Badge variant={assetTypeBadgeVariant(opp)} className="text-[10px]">
                      {assetTypeLabel(opp)}
                    </Badge>
                    <Badge variant={opportunityBadgeVariant(opp)} className="text-[10px]">
                      {opportunityTrendLabel(opp)}
                    </Badge>
                  </div>
                  <div className="font-semibold text-text-primary truncate">{opp.symbol}</div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-mono tabular-nums text-text-primary">
                      {typeof opp.price === 'number'
                        ? opp.price >= 1
                          ? `$${opp.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `$${opp.price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`
                        : '—'}
                    </span>
                    <span
                      className={`text-xs font-medium tabular-nums ${isPositive ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {isPositive ? '+' : ''}
                      {typeof change === 'number' ? change.toFixed(2) : '0.00'}%
                    </span>
                  </div>
                  {reasonText && (
                    <p className="text-[11px] text-text-secondary line-clamp-2">{reasonText}</p>
                  )}
                  <div className="flex items-center gap-2 mt-auto pt-1">
                    {onAnalyze ? (
                      <button
                        type="button"
                        onClick={() => onAnalyze(market, opp.symbol ?? '')}
                        className="inline-flex items-center gap-1 text-accent-primary hover:text-accent-soft text-xs font-medium"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Analyze
                      </button>
                    ) : (
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 text-accent-primary hover:text-accent-soft text-xs font-medium"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Analyze
                      </Link>
                    )}
                    <Link
                      href={`/indicator-analysis?symbol=${encodeURIComponent(opp.symbol ?? '')}&market=${encodeURIComponent(opp.market ?? 'Crypto')}`}
                      className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-xs font-medium"
                    >
                      Trade Now
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
