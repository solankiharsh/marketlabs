'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MarketScan } from '@/lib/api';

interface AnalysisCardProps {
  scan: MarketScan;
}

export function AnalysisCard({ scan }: AnalysisCardProps) {
  const [isFullView, setIsFullView] = useState(false);

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

  const scoreNum = toNumber(scan.score);
  const rsiNum = toNumber(scan.rsi);
  const macdNum = toNumber(scan.macd);

  // Bite-size summary
  const assetName = scan.asset?.displayName || scan.asset?.symbol || 'Asset';
  const biteSizeSummary = `${assetName} shows a ${scan.setupType || 'neutral'} setup with a score of ${scoreNum?.toFixed(0) || '—'}/100. ${
    rsiNum ? `RSI at ${rsiNum.toFixed(1)}` : ''
  }${macdNum ? `, MACD ${macdNum > 0 ? 'positive' : 'negative'}` : ''}.`;

  return (
    <div className="space-y-4">
      {/* Toggle Button */}
      <button
        onClick={() => setIsFullView(!isFullView)}
        className="flex items-center gap-2 text-sm text-accent-primary hover:text-accent-soft transition-colors"
      >
        {isFullView ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Show Bite-size Summary
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Show Full Analysis
          </>
        )}
      </button>

      {/* Bite-size View */}
      {!isFullView && (
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-text-secondary">{biteSizeSummary}</p>
        </div>
      )}

      {/* Full View */}
      {isFullView && (
        <div className="space-y-4">
          {/* Price Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-card border border-border rounded">
              <div className="text-xs text-text-muted mb-1">Price</div>
              <div className="text-lg font-bold">{toNumber(scan.price)?.toFixed(4) || '—'}</div>
            </div>
            <div className="p-3 bg-card border border-border rounded">
              <div className="text-xs text-text-muted mb-1">24h Change</div>
              <div className={`text-lg font-bold ${
                toNumber(scan.change24h) && toNumber(scan.change24h)! > 0 ? 'text-success' : 'text-error'
              }`}>
                {toNumber(scan.change24h) ? `${toNumber(scan.change24h)! > 0 ? '+' : ''}${toNumber(scan.change24h)!.toFixed(2)}%` : '—'}
              </div>
            </div>
            <div className="p-3 bg-card border border-border rounded">
              <div className="text-xs text-text-muted mb-1">Score</div>
              <div className="text-lg font-bold">{scoreNum?.toFixed(0) || '—'}/100</div>
            </div>
            <div className="p-3 bg-card border border-border rounded">
              <div className="text-xs text-text-muted mb-1">Momentum</div>
              <div className="text-lg font-bold">
                {toNumber(scan.momentum) ? `${toNumber(scan.momentum)! > 0 ? '+' : ''}${toNumber(scan.momentum)!.toFixed(0)}` : '—'}
              </div>
            </div>
          </div>

          {/* Technical Indicators */}
          <div className="p-4 bg-card border border-border rounded-lg">
            <h4 className="text-sm font-semibold mb-3">Technical Indicators</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-text-muted mb-1">RSI (14)</div>
                <div className="text-sm font-mono">{rsiNum?.toFixed(2) || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-text-muted mb-1">MACD</div>
                <div className="text-sm font-mono">{macdNum?.toFixed(4) || '—'}</div>
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

          {/* AI Analysis (if available) */}
          {scan.aiSummary && (
            <div className="p-4 bg-card border border-border rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Analysis</h4>
              <p className="text-sm text-text-secondary">{scan.aiSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

