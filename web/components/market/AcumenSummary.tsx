'use client';

import { Activity, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface AcumenSummaryProps {
  symbol: string;
  displayName: string;
  overallConfidence?: number;
  signalStrength?: 'strong' | 'moderate' | 'weak';
  patternCount?: number;
  hasSRLevels?: boolean;
  hasAIAnalysis?: boolean;
  score?: number;
  setupType?: string;
}

export function AcumenSummary({
  symbol,
  displayName,
  overallConfidence,
  signalStrength,
  patternCount = 0,
  hasSRLevels = false,
  hasAIAnalysis = false,
  score,
  setupType,
}: AcumenSummaryProps) {
  // Helper to convert Decimal to number
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

  const confidenceNum = toNumber(overallConfidence);

  const getSignalStrengthColor = () => {
    switch (signalStrength) {
      case 'strong':
        return 'bg-success/10 text-success border-success/30';
      case 'moderate':
        return 'bg-accent-primary/10 text-accent-primary border-accent-primary/30';
      case 'weak':
        return 'bg-warning/10 text-warning border-warning/30';
      default:
        return 'bg-text-muted/10 text-text-muted border-border';
    }
  };

  const getSignalStrengthIcon = () => {
    switch (signalStrength) {
      case 'strong':
        return <TrendingUp className="w-4 h-4" />;
      case 'moderate':
        return <Activity className="w-4 h-4" />;
      case 'weak':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <Link
      href={`/market/${symbol}`}
      className="block bg-card border border-border rounded-lg p-4 hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-text-primary">{displayName}</h4>
          <div className="text-xs text-text-muted">{symbol}</div>
          {setupType && (
            <div className={`text-xs mt-1 px-2 py-0.5 rounded inline-block ${
              setupType === 'bullish' ? 'bg-success/10 text-success' :
              setupType === 'bearish' ? 'bg-error/10 text-error' :
              'bg-text-muted/10 text-text-muted'
            }`}>
              {setupType.toUpperCase()}
            </div>
          )}
        </div>
        <div className="text-right">
          {confidenceNum !== null ? (
            <>
              <div className={`text-lg font-bold ${
                confidenceNum >= 75 ? 'text-success' :
                confidenceNum >= 55 ? 'text-accent-primary' : 'text-warning'
              }`}>
                {confidenceNum.toFixed(0)}%
              </div>
              {signalStrength && (
                <div className={`text-xs px-2 py-0.5 rounded border mt-1 flex items-center gap-1 ${getSignalStrengthColor()}`}>
                  {getSignalStrengthIcon()}
                  {signalStrength.toUpperCase()}
                </div>
              )}
            </>
          ) : score !== undefined && score !== null ? (
            (() => {
              const s = toNumber(score) ?? 0;
              return (
                <div className={`text-lg font-bold ${
                  s >= 70 ? 'text-success' :
                  s >= 50 ? 'text-accent-primary' :
                  s >= 30 ? 'text-warning' : 'text-error'
                }`}>
                  {s.toFixed(0)}
                </div>
              );
            })()
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-text-muted">
        {patternCount > 0 && (
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {patternCount} pattern{patternCount !== 1 ? 's' : ''}
          </span>
        )}
        {hasSRLevels && (
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            S/R levels
          </span>
        )}
        {hasAIAnalysis && (
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            AI analysis
          </span>
        )}
      </div>
    </Link>
  );
}

