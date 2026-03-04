'use client';

import { MarketScan } from '@/lib/api';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface TechnicalSummaryProps {
  scan: MarketScan;
}

export function TechnicalSummary({ scan }: TechnicalSummaryProps) {
  // Helper to safely convert Decimal/string/number to number
  const toNumber = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    if (typeof value === 'object' && 'toString' in value) {
      const num = parseFloat(value.toString());
      return isNaN(num) ? null : num;
    }
    return null;
  };

  const getIndicatorStatus = (value: number | null | undefined, thresholds: { overbought: number; oversold: number }) => {
    if (value === undefined || value === null) return 'neutral';
    if (value >= thresholds.overbought) return 'overbought';
    if (value <= thresholds.oversold) return 'oversold';
    return 'neutral';
  };

  const rsiNum = toNumber(scan.rsi);
  const macdNum = toNumber(scan.macd);
  const macdSignalNum = toNumber(scan.macdSignal);
  const rsiStatus = getIndicatorStatus(rsiNum, { overbought: 70, oversold: 30 });
  const macdBullish = macdNum !== null && macdSignalNum !== null ? macdNum > macdSignalNum : false;
  const score = toNumber(scan.score) || 0;
  const momentum = toNumber(scan.momentum) || 0;

  // Determine overall signal strength
  const getSignalStrength = () => {
    if (score >= 70) return { label: 'Strong', color: 'text-success' };
    if (score >= 50) return { label: 'Moderate', color: 'text-accent-primary' };
    if (score >= 30) return { label: 'Weak', color: 'text-text-muted' };
    return { label: 'Very Weak', color: 'text-error' };
  };

  const signalStrength = getSignalStrength();

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Technical Summary</h3>
      
      {/* Overall Signal & Score */}
      <div className="p-4 bg-white/[0.02] rounded-lg border border-border mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-text-muted">Overall Signal</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-1 rounded ${
              scan.setupType === 'bullish'
                ? 'bg-success/10 text-success'
                : scan.setupType === 'bearish'
                ? 'bg-error/10 text-error'
                : 'bg-text-muted/10 text-text-muted'
            }`}>
              {scan.setupType?.toUpperCase() || 'NEUTRAL'}
            </span>
            <span className={`text-xs font-semibold ${signalStrength.color}`}>
              {signalStrength.label}
            </span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold">{score.toFixed(0)}</div>
          <div className="text-lg text-text-muted">/100</div>
        </div>
      </div>

      {/* Key Signal Indicators */}
      <div className="space-y-3">
        <div className="p-3 bg-white/[0.02] rounded border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">RSI Signal</span>
            {rsiStatus === 'overbought' && (
              <span className="text-xs text-error font-semibold">Overbought</span>
            )}
            {rsiStatus === 'oversold' && (
              <span className="text-xs text-success font-semibold">Oversold</span>
            )}
            {rsiStatus === 'neutral' && (
              <span className="text-xs text-text-muted font-semibold">Neutral</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-lg font-bold ${
              rsiStatus === 'overbought' ? 'text-error' :
              rsiStatus === 'oversold' ? 'text-success' : 'text-text-primary'
            }`}>
              {rsiNum?.toFixed(1) || '—'}
            </div>
            {rsiStatus === 'overbought' && <TrendingDown className="w-4 h-4 text-error" />}
            {rsiStatus === 'oversold' && <TrendingUp className="w-4 h-4 text-success" />}
            {rsiStatus === 'neutral' && <Minus className="w-4 h-4 text-text-muted" />}
          </div>
        </div>

        <div className="p-3 bg-white/[0.02] rounded border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">MACD Signal</span>
            <span className={`text-xs font-semibold ${macdBullish ? 'text-success' : 'text-error'}`}>
              {macdBullish ? 'Bullish' : 'Bearish'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-lg font-bold ${macdBullish ? 'text-success' : 'text-error'}`}>
              {macdNum?.toFixed(4) || '—'}
            </div>
            {macdBullish ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-error" />}
          </div>
        </div>

        {/* Momentum */}
        {scan.momentum !== undefined && scan.momentum !== null && (
          <div className="p-3 bg-white/[0.02] rounded border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">Momentum</span>
              <span className={`text-xs font-semibold ${momentum >= 0 ? 'text-success' : 'text-error'}`}>
                {momentum >= 0 ? 'Positive' : 'Negative'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    momentum > 0 ? 'bg-success' : 'bg-error'
                  }`}
                  style={{ width: `${Math.min(100, Math.abs(momentum))}%` }}
                />
              </div>
              <span className={`text-sm font-semibold ${momentum >= 0 ? 'text-success' : 'text-error'}`}>
                {momentum >= 0 ? '+' : ''}{momentum.toFixed(0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Insight */}
      <div className="mt-4 p-3 bg-accent-primary/5 border border-accent-primary/20 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-accent-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs text-text-secondary">
            {scan.setupType === 'bullish' ? (
              <>Strong bullish signals detected. RSI and MACD align with positive momentum.</>
            ) : scan.setupType === 'bearish' ? (
              <>Bearish signals present. Consider risk management strategies.</>
            ) : (
              <>Mixed signals detected. Monitor key levels for directional confirmation.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

