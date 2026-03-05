'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import {
  getGlobalOverview,
  getGlobalHeatmap,
  getGlobalNews,
  getEconomicCalendar,
  getMarketSentiment,
  getOpportunities,
  refreshGlobalData,
  type Opportunity,
} from '@/lib/api';
import { Sparkles, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

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

function marketRoute(opp: Opportunity): { href: string; market: string } {
  const market = opp.market === 'USStock' ? 'USStock' : opp.market === 'Forex' ? 'Forex' : 'Crypto';
  const sym = (opp.symbol ?? '').replace(/\//g, '-');
  return { href: `/market/${encodeURIComponent(sym)}?market=${encodeURIComponent(market)}`, market };
}

export default function GlobalMarketPage() {
  const [overview, setOverview] = useState<Record<string, unknown>>({});
  const [heatmap, setHeatmap] = useState<Record<string, unknown>>({});
  const [news, setNews] = useState<unknown[]>([]);
  const [calendar, setCalendar] = useState<unknown[]>([]);
  const [sentiment, setSentiment] = useState<Record<string, unknown>>({});
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [opportunitiesRefreshing, setOpportunitiesRefreshing] = useState(false);

  const loadOpportunities = useCallback(async (force = false) => {
    if (force) setOpportunitiesRefreshing(true);
    else setOpportunitiesLoading(true);
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
      setOpportunitiesLoading(false);
      setOpportunitiesRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      getGlobalOverview().then(setOverview).catch(() => ({})),
      getGlobalHeatmap().then(setHeatmap).catch(() => ({})),
      getGlobalNews().then(setNews).catch(() => []),
      getEconomicCalendar().then(setCalendar).catch(() => []),
      getMarketSentiment().then(setSentiment).catch(() => ({})),
      loadOpportunities(false),
    ]).finally(() => setLoading(false));
  }, [loadOpportunities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-text-muted">Loading global market...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Global Market</h1>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="rounded-lg border border-border bg-card p-4">
            <pre className="text-sm text-text-secondary overflow-auto max-h-96">
              {JSON.stringify(overview, null, 2)}
            </pre>
          </div>
        </TabsContent>
        <TabsContent value="heatmap">
          <div className="rounded-lg border border-border bg-card p-4">
            <pre className="text-sm text-text-secondary overflow-auto max-h-96">
              {JSON.stringify(heatmap, null, 2)}
            </pre>
          </div>
        </TabsContent>
        <TabsContent value="news">
          <ul className="space-y-2">
            {(news as Record<string, unknown>[]).map((n, i) => (
              <li key={i} className="rounded-lg border border-border bg-card p-3">
                <p className="font-medium text-text-primary">{String(n.title ?? n.headline ?? '—')}</p>
                <p className="text-sm text-text-muted">{String(n.source ?? n.url ?? '')}</p>
              </li>
            ))}
            {news.length === 0 && <li className="text-text-muted text-sm">No news</li>}
          </ul>
        </TabsContent>
        <TabsContent value="calendar">
          <ul className="space-y-2">
            {(calendar as Record<string, unknown>[]).map((c, i) => (
              <li key={i} className="rounded-lg border border-border bg-card p-3 text-sm">
                {String(c.title ?? c.event ?? c.name ?? JSON.stringify(c))}
              </li>
            ))}
            {calendar.length === 0 && <li className="text-text-muted text-sm">No events</li>}
          </ul>
        </TabsContent>
        <TabsContent value="sentiment">
          <div className="rounded-lg border border-border bg-card p-4">
            <pre className="text-sm text-text-secondary overflow-auto max-h-96">
              {JSON.stringify(sentiment, null, 2)}
            </pre>
          </div>
        </TabsContent>
        <TabsContent value="opportunities">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent-primary" />
                  AI Opportunity Radar
                </h2>
                <span className="text-xs text-text-muted">Updates hourly</span>
              </div>
              <button
                type="button"
                onClick={() => loadOpportunities(true)}
                disabled={opportunitiesRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated hover:border-accent-primary/30 text-text-primary text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${opportunitiesRefreshing ? 'animate-spin' : ''}`} />
                {opportunitiesRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {opportunitiesLoading && opportunities.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-text-muted">
                <p>Loading opportunities...</p>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-text-muted">
                <p>No opportunities right now. Try refreshing later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {opportunities.map((opp, i) => {
                  const { href, market } = marketRoute(opp);
                  const change = opp.change_24h ?? 0;
                  const isPositive = change >= 0;
                  return (
                    <div
                      key={`${opp.market ?? ''}-${opp.symbol ?? ''}-${i}`}
                      className="rounded-xl border border-border bg-card overflow-hidden hover:border-accent-primary/30 transition-colors flex flex-col"
                    >
                      <div className="p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={href}
                            className="font-semibold text-text-primary hover:text-accent-primary truncate min-w-0"
                          >
                            {opp.symbol}
                          </Link>
                          <Badge variant={opportunityBadgeVariant(opp)}>
                            {opportunityTrendLabel(opp)}
                          </Badge>
                        </div>
                        {opp.name && opp.name !== opp.symbol && (
                          <p className="text-xs text-text-muted truncate" title={opp.name}>
                            {opp.name}
                          </p>
                        )}
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-lg font-medium text-text-primary">
                            {typeof opp.price === 'number'
                              ? opp.price >= 1
                                ? opp.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : opp.price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })
                              : '—'}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              isPositive ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {typeof change === 'number' ? change.toFixed(2) : '0.00'}%
                          </span>
                        </div>
                        {opp.reason && (
                          <p className="text-xs text-text-secondary line-clamp-2">{opp.reason}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-auto pt-2">
                          <Link
                            href={href}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary text-xs font-medium hover:bg-accent-primary/30 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Analyze
                          </Link>
                          <Link
                            href="/trade"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-secondary text-text-secondary text-xs font-medium hover:bg-bg-elevated hover:border-accent-primary/30 hover:text-accent-primary transition-colors"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            Trade now
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
