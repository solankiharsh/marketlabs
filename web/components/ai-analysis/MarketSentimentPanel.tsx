'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { getMarketSentiment, type MarketSentimentData, type SentimentIndicator } from '@/lib/api';

function formatChange(change: number | undefined): string {
  if (change == null || Number.isNaN(change)) return '';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${Number(change).toFixed(2)}%`;
}

function SentimentRow({
  label,
  data,
  valueLabel,
}: {
  label: string;
  data: SentimentIndicator | undefined;
  valueLabel?: (v: SentimentIndicator) => string;
}) {
  if (!data) return null;
  const value = data.value;
  const change = data.change;
  const interpretation = (data.interpretation_en ?? data.interpretation ?? '') as string;
  const classification = (data.classification ?? '') as string;
  const level = (data.level ?? '') as string;
  const signal = (data.signal ?? '') as string;
  const displayValue =
    valueLabel ? valueLabel(data) : typeof value === 'number' ? (value >= 1000 ? `${(value / 1000).toFixed(2)}K` : value.toFixed(2)) : '—';
  const hasChange = typeof change === 'number';

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 py-1.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-medium text-text-muted uppercase shrink-0">{label}</span>
        <span className="font-mono text-sm font-semibold text-text-primary tabular-nums">{displayValue}</span>
        {classification && (
          <span className="text-[10px] text-text-secondary">({classification})</span>
        )}
        {hasChange && (
          <span
            className={`text-xs font-mono tabular-nums ${
              (change as number) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {formatChange(change as number)}
          </span>
        )}
      </div>
      <div className="text-right min-w-0">
        {level && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-secondary capitalize mr-1">
            {level.replace(/_/g, ' ')}
          </span>
        )}
        {signal && signal !== 'neutral' && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              signal === 'bullish' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {signal}
          </span>
        )}
      </div>
      {interpretation && (
        <p className="w-full text-[11px] text-text-secondary mt-0.5">{interpretation}</p>
      )}
    </div>
  );
}

export function MarketSentimentPanel() {
  const [data, setData] = useState<MarketSentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = (cacheBust?: number) => {
    setError(null);
    if (cacheBust == null) setLoading(true);
    getMarketSentiment(cacheBust)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load sentiment'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRefresh = () => {
    load(Date.now());
  };

  if (error) {
    return (
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-primary" />
            Market Sentiment
          </h3>
        </div>
        <p className="text-error text-sm">{error}</p>
        <button
          type="button"
          onClick={handleRefresh}
          className="mt-2 text-xs text-accent-primary hover:underline"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-secondary/50">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 text-left flex-1 min-w-0 group"
          aria-expanded={expanded}
        >
          <Activity className="w-4 h-4 text-accent-primary shrink-0" />
          <h3 className="text-sm font-semibold text-text-primary">Market Sentiment</h3>
          <span className="p-1 rounded text-text-muted group-hover:text-text-primary group-hover:bg-bg-elevated transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRefresh();
          }}
          disabled={loading}
          className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-50"
          aria-label="Refresh sentiment"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="p-3 max-h-[320px] overflow-y-auto">
            {loading && !data ? (
              <p className="text-text-muted text-sm py-4">Loading sentiment...</p>
            ) : (
              <div className="space-y-0">
                <SentimentRow label="DXY" data={data?.dxy} />
                <SentimentRow label="Fear & Greed" data={data?.fear_greed} />
                <SentimentRow label="GVZ" data={data?.gvz} />
                <SentimentRow label="VIX" data={data?.vix} />
                <SentimentRow
                  label="VIX Term"
                  data={data?.vix_term}
                  valueLabel={(d) =>
                    typeof d.value === 'number' ? (d.value as number).toFixed(3) : '—'
                  }
                />
                <SentimentRow label="VXN" data={data?.vxn} />
                <SentimentRow
                  label="Yield Curve"
                  data={data?.yield_curve}
                  valueLabel={(d) =>
                    typeof d.spread === 'number' ? `${(d.spread as number).toFixed(2)}%` : '—'
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
