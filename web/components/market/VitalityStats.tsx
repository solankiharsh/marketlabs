'use client';

import { CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface VitalityStatsData {
  gsr?: number;
  week52High?: number;
  week52Low?: number;
  deficit?: string;
  rateSpread?: number;
}

interface VitalityStatsProps {
  currentPrice: number;
  setupType?: 'bullish' | 'bearish' | 'neutral';
  stats?: VitalityStatsData;
}

export function VitalityStats({ currentPrice, setupType = 'neutral', stats }: VitalityStatsProps) {
  const getSignalStatus = () => {
    if (setupType === 'bullish') return 'BULLISH';
    if (setupType === 'bearish') return 'BEARISH';
    return 'NEUTRAL';
  };

  const getSignalColor = () => {
    if (setupType === 'bullish') return 'text-success';
    if (setupType === 'bearish') return 'text-error';
    return 'text-text-muted';
  };

  const getSignalBg = () => {
    if (setupType === 'bullish') return 'bg-success/10 border-success/30';
    if (setupType === 'bearish') return 'bg-error/10 border-error/30';
    return 'bg-text-muted/10 border-text-muted/30';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {/* Header with Verified Badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-display font-bold">Vitality Stats</h2>
          <span title="Verified" aria-label="Verified"><CheckCircle2 className="w-5 h-5 text-accent-primary" /></span>
        </div>
        <div className={`px-4 py-2 rounded-lg border ${getSignalBg()} ${getSignalColor()}`}>
          <span className="text-sm font-semibold">{getSignalStatus()}</span>
          {setupType === 'neutral' && (
            <span className="text-xs ml-2 opacity-75">(STRUCTURAL EXPANSION VS. MEAN REVERSION)</span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Current Spot Price */}
        <div className="p-4 bg-white/[0.02] rounded-lg border border-border">
          <div className="text-xs text-text-muted mb-1">Current Spot Price</div>
          <div className="text-2xl font-bold font-mono text-text-primary">
            ${currentPrice.toFixed(2)}
          </div>
        </div>

        {/* Gold-to-Silver Ratio */}
        {stats?.gsr && (
          <div className="p-4 bg-white/[0.02] rounded-lg border border-border">
            <div className="text-xs text-text-muted mb-1">Gold-to-Silver Ratio (GSR)</div>
            <div className="text-2xl font-bold font-mono text-text-primary">
              {stats.gsr.toFixed(1)}
            </div>
          </div>
        )}

        {/* 52-Week High */}
        {stats?.week52High && (
          <div className="p-4 bg-white/[0.02] rounded-lg border border-border">
            <div className="text-xs text-text-muted mb-1">52-Week High (Intraday)</div>
            <div className="text-2xl font-bold font-mono text-success">
              ${stats.week52High.toFixed(2)}
            </div>
          </div>
        )}

        {/* 52-Week Low */}
        {stats?.week52Low && (
          <div className="p-4 bg-white/[0.02] rounded-lg border border-border">
            <div className="text-xs text-text-muted mb-1">52-Week Low</div>
            <div className="text-2xl font-bold font-mono text-error">
              ${stats.week52Low.toFixed(2)}
            </div>
          </div>
        )}

        {/* Estimated Deficit */}
        {stats?.deficit && (
          <div className="p-4 bg-white/[0.02] rounded-lg border border-border">
            <div className="text-xs text-text-muted mb-1">Estimated 2026 Deficit</div>
            <div className="text-xl font-bold text-text-primary">
              {stats.deficit}
            </div>
          </div>
        )}

        {/* Fed-ECB Rate Spread */}
        {stats?.rateSpread && (
          <div className="p-4 bg-white/[0.02] rounded-lg border border-border">
            <div className="text-xs text-text-muted mb-1">Fed-ECB Rate Spread</div>
            <div className="text-2xl font-bold font-mono text-text-primary">
              {stats.rateSpread.toFixed(0)} bps
            </div>
          </div>
        )}
      </div>

      {/* Price Range Indicator */}
      {stats?.week52High && stats?.week52Low && (
        <div className="mt-6 p-4 bg-white/[0.02] rounded-lg border border-border">
          <div className="text-xs text-text-muted mb-3">52-Week Price Range</div>
          <div className="relative h-8 bg-white/[0.05] rounded-full overflow-hidden">
            <div className="absolute inset-0 flex items-center">
              <div
                className="h-full bg-gradient-to-r from-error via-accent-primary to-success"
                style={{
                  width: '100%',
                }}
              />
            </div>
            <div
              className="absolute top-0 bottom-0 w-1 bg-text-primary z-10"
              style={{
                left: stats.week52High !== stats.week52Low
                  ? `${Math.max(0, Math.min(100, ((currentPrice - stats.week52Low) / (stats.week52High - stats.week52Low)) * 100))}%`
                  : '50%',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-mono">
              <span className="text-error">${stats.week52Low.toFixed(2)}</span>
              <span className="text-text-primary font-bold">${currentPrice.toFixed(2)}</span>
              <span className="text-success">${stats.week52High.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

