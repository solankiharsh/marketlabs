'use client';

import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react';

interface ConfidenceScoringProps {
  patternConfidence?: number;
  volumeConfidence?: number;
  trendConfidence?: number;
  indicatorConfidence?: number;
  overallConfidence?: number;
  signalStrength?: 'strong' | 'moderate' | 'weak';
}

export function ConfidenceScoring({
  patternConfidence,
  volumeConfidence,
  trendConfidence,
  indicatorConfidence,
  overallConfidence,
  signalStrength,
}: ConfidenceScoringProps) {
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

  const patternNum = toNumber(patternConfidence);
  const volumeNum = toNumber(volumeConfidence);
  const trendNum = toNumber(trendConfidence);
  const indicatorNum = toNumber(indicatorConfidence);
  const overallNum = toNumber(overallConfidence);

  const getConfidenceColor = (value: number | null) => {
    if (value === null) return 'text-text-muted';
    if (value >= 75) return 'text-success';
    if (value >= 55) return 'text-accent-primary';
    return 'text-warning';
  };

  const getSignalStrengthColor = () => {
    switch (signalStrength) {
      case 'strong':
        return 'bg-success/10 text-success border-success/20';
      case 'moderate':
        return 'bg-accent-primary/10 text-accent-primary border-accent-primary/20';
      case 'weak':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-text-muted/10 text-text-muted border-border';
    }
  };

  const getSignalStrengthLabel = () => {
    switch (signalStrength) {
      case 'strong':
        return 'Strong Signal';
      case 'moderate':
        return 'Moderate Signal';
      case 'weak':
        return 'Weak Signal';
      default:
        return 'No Signal';
    }
  };

  if (!overallNum && !patternNum && !volumeNum && !trendNum && !indicatorNum) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-accent-primary" />
        <h3 className="text-xl font-semibold">Confidence Scoring</h3>
      </div>

      {/* Overall Confidence */}
      {overallNum !== null && (
        <div className="mb-6 p-4 bg-white/[0.02] border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">Overall Confidence</span>
            <span className={`text-2xl font-bold ${getConfidenceColor(overallNum)}`}>
              {overallNum.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-white/[0.05] rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                overallNum >= 75
                  ? 'bg-success'
                  : overallNum >= 55
                  ? 'bg-accent-primary'
                  : 'bg-warning'
              }`}
              style={{ width: `${overallNum}%` }}
            />
          </div>
          {signalStrength && (
            <div className={`mt-3 px-3 py-1 rounded border text-sm font-semibold text-center ${getSignalStrengthColor()}`}>
              {getSignalStrengthLabel()}
            </div>
          )}
        </div>
      )}

      {/* Factor Breakdown */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text-muted mb-3">Factor Breakdown</h4>

        {/* Pattern Confidence (35%) */}
        {patternNum !== null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-accent-primary" />
                <span className="text-sm font-semibold">Pattern Confidence</span>
                <span className="text-xs text-text-muted">(35%)</span>
              </div>
              <span className={`text-sm font-bold ${getConfidenceColor(patternNum)}`}>
                {patternNum.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-accent-primary transition-all"
                style={{ width: `${patternNum}%` }}
              />
            </div>
          </div>
        )}

        {/* Volume Confirmation (20%) */}
        {volumeNum !== null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent-primary" />
                <span className="text-sm font-semibold">Volume Confirmation</span>
                <span className="text-xs text-text-muted">(20%)</span>
              </div>
              <span className={`text-sm font-bold ${getConfidenceColor(volumeNum)}`}>
                {volumeNum.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-accent-primary transition-all"
                style={{ width: `${volumeNum}%` }}
              />
            </div>
          </div>
        )}

        {/* Trend Alignment (20%) */}
        {trendNum !== null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {trendNum >= 70 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-error" />
                )}
                <span className="text-sm font-semibold">Trend Alignment</span>
                <span className="text-xs text-text-muted">(20%)</span>
              </div>
              <span className={`text-sm font-bold ${getConfidenceColor(trendNum)}`}>
                {trendNum.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-accent-primary transition-all"
                style={{ width: `${trendNum}%` }}
              />
            </div>
          </div>
        )}

        {/* Indicator Confluence (25%) */}
        {indicatorNum !== null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-accent-primary" />
                <span className="text-sm font-semibold">Indicator Confluence</span>
                <span className="text-xs text-text-muted">(25%)</span>
              </div>
              <span className={`text-sm font-bold ${getConfidenceColor(indicatorNum)}`}>
                {indicatorNum.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-accent-primary transition-all"
                style={{ width: `${indicatorNum}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

