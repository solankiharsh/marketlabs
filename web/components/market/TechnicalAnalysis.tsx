'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { MarketScan } from '@/lib/api';

interface TechnicalAnalysisProps {
  scan: MarketScan;
}

export function TechnicalAnalysis({ scan }: TechnicalAnalysisProps) {
  const [showSummary, setShowSummary] = useState(false);

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

  const price = toNumber(scan.price) || 0;
  const change24h = toNumber(scan.change24h) || 0;
  const score = toNumber(scan.score) || 0;
  const momentum = toNumber(scan.momentum) || 0;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Technical Analysis</h3>
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white/[0.02] border border-accent-primary/20 rounded-lg hover:bg-white/[0.03] transition-colors"
        >
          <span className="text-text-primary">Summary</span>
          {showSummary ? (
            <ChevronUp className="w-3 h-3 text-accent-primary" />
          ) : (
            <ChevronDown className="w-3 h-3 text-accent-primary" />
          )}
        </button>
      </div>

      {/* Price & Change Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 bg-white/[0.02] rounded border border-border">
          <div className="text-xs text-text-muted mb-1">Current Price</div>
          <div className="text-lg font-bold font-mono">{price.toFixed(4)}</div>
        </div>
        <div className="p-3 bg-white/[0.02] rounded border border-border">
          <div className="text-xs text-text-muted mb-1">24h Change</div>
          <div className={`text-lg font-bold ${change24h >= 0 ? 'text-success' : 'text-error'}`}>
            {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Technical Indicators */}
      <div>
        <h4 className="text-base font-semibold mb-3">Technical Indicators</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-text-muted mb-1">RSI (14)</div>
            <div className="text-sm font-mono">{toNumber(scan.rsi)?.toFixed(2) || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">MACD</div>
            <div className="text-sm font-mono">{toNumber(scan.macd)?.toFixed(4) || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">Signal</div>
            <div className="text-sm font-mono">{toNumber(scan.macdSignal)?.toFixed(4) || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">SMA 20</div>
            <div className="text-sm font-mono">{toNumber(scan.sma20)?.toFixed(4) || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">EMA 50</div>
            <div className="text-sm font-mono">{toNumber(scan.ema50)?.toFixed(4) || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">BB Upper</div>
            <div className="text-sm font-mono">{toNumber(scan.bbUpper)?.toFixed(4) || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">BB Lower</div>
            <div className="text-sm font-mono">{toNumber(scan.bbLower)?.toFixed(4) || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">ADX</div>
            <div className="text-sm font-mono">{toNumber(scan.adx)?.toFixed(2) || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">ATR</div>
            <div className="text-sm font-mono">{toNumber(scan.atr)?.toFixed(4) || '—'}</div>
          </div>
        </div>
      </div>

      {/* Bite-size Summary (Collapsible) */}
      {showSummary && (
        <div className="mt-4 p-4 bg-white/[0.02] rounded-lg border border-border">
          <h5 className="text-sm font-semibold mb-2">Bite-size Summary</h5>
          <p className="text-xs text-text-secondary leading-relaxed">
            {scan.setupType === 'bullish' ? (
              <>The asset shows bullish momentum with a score of {score.toFixed(0)}/100. Technical indicators suggest potential upward movement.</>
            ) : scan.setupType === 'bearish' ? (
              <>The asset shows bearish signals with a score of {score.toFixed(0)}/100. Technical indicators suggest potential downward pressure.</>
            ) : (
              <>The asset is in a neutral state with a score of {score.toFixed(0)}/100. Technical indicators suggest consolidation.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

