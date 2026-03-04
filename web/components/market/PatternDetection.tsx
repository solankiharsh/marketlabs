'use client';

import { TrendingUp, TrendingDown, Minus, BarChart3, Activity } from 'lucide-react';
import { DetectedPattern } from '@/lib/api';

interface PatternDetectionProps {
  patterns: DetectedPattern[];
}

export function PatternDetection({ patterns }: PatternDetectionProps) {
  // Helper to convert Decimal/string/number to number
  const toNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'object' && 'toString' in value) {
      const num = parseFloat(value.toString());
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  if (patterns.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Pattern Detection</h3>
        <div className="text-center py-8 text-text-muted">
          No patterns detected at this time.
        </div>
      </div>
    );
  }

  // Deduplicate patterns: keep only the highest confidence instance of each pattern name + direction
  const deduplicatedPatterns = patterns.reduce((acc, pattern) => {
    const key = `${pattern.patternName}-${pattern.direction}`;
    const existing = acc.get(key);
    
    if (!existing || toNumber(pattern.confidence) > toNumber(existing.confidence)) {
      acc.set(key, pattern);
    }
    
    return acc;
  }, new Map<string, DetectedPattern>());

  const uniquePatterns = Array.from(deduplicatedPatterns.values());

  const chartPatterns = uniquePatterns.filter(p => p.patternType === 'chart');
  const candlestickPatterns = uniquePatterns.filter(p => p.patternType === 'candlestick');

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'bearish':
        return <TrendingDown className="w-4 h-4 text-error" />;
      default:
        return <Minus className="w-4 h-4 text-text-muted" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    const confNum = toNumber(confidence);
    if (confNum >= 80) return 'text-success';
    if (confNum >= 60) return 'text-accent-primary';
    return 'text-text-muted';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Pattern Detection</h3>
      <div className="text-sm text-text-muted mb-4">
        {uniquePatterns.length} unique pattern{uniquePatterns.length !== 1 ? 's' : ''} detected
        {patterns.length > uniquePatterns.length && (
          <span className="ml-2 text-xs">({patterns.length} total instances)</span>
        )}
      </div>

      <div className="space-y-4">
        {/* Chart Patterns */}
        {chartPatterns.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-accent-primary" />
              <h4 className="text-sm font-semibold">Chart Patterns ({chartPatterns.length})</h4>
            </div>
            <div className="space-y-2">
              {chartPatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="p-3 bg-white/[0.02] border border-border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getDirectionIcon(pattern.direction)}
                      <span className="text-sm font-semibold">{pattern.patternName}</span>
                    </div>
                    <span className={`text-sm font-bold ${getConfidenceColor(pattern.confidence)}`}>
                      {toNumber(pattern.confidence).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-text-muted capitalize">{pattern.direction}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Candlestick Patterns */}
        {candlestickPatterns.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-accent-primary" />
              <h4 className="text-sm font-semibold">Candlestick Patterns ({candlestickPatterns.length})</h4>
            </div>
            <div className="space-y-2">
              {candlestickPatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="p-3 bg-white/[0.02] border border-border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getDirectionIcon(pattern.direction)}
                      <span className="text-sm font-semibold">{pattern.patternName}</span>
                    </div>
                    <span className={`text-sm font-bold ${getConfidenceColor(pattern.confidence)}`}>
                      {toNumber(pattern.confidence).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-text-muted capitalize">{pattern.direction}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
