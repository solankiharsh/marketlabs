'use client';

import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export interface TimeframeAnalysis {
  timeframe: 'intraday' | 'weekly' | 'monthly';
  analysis: string;
  verifiedDate?: Date;
}

interface MultiTimeframeFrameworkProps {
  analyses: TimeframeAnalysis[];
}

export function MultiTimeframeFramework({ analyses }: MultiTimeframeFrameworkProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (timeframe: string) => {
    setExpanded((prev) => ({
      ...prev,
      [timeframe]: !prev[timeframe],
    }));
  };

  const getTimeframeLabel = (timeframe: string) => {
    switch (timeframe) {
      case 'intraday':
        return 'Intraday';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      default:
        return timeframe;
    }
  };

  const formatVerifiedDate = (date?: Date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get verified date from first analysis (they should all have the same date)
  const verifiedDate = analyses[0]?.verifiedDate;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Multi-Timeframe Decision Framework</h3>
        {verifiedDate && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <CheckCircle2 className="w-4 h-4 text-accent-primary" />
            <span>Verified Thresholds: {formatVerifiedDate(verifiedDate)}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {analyses.map((analysis) => (
          <div
            key={analysis.timeframe}
            className="bg-white/[0.02] border border-border rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleExpand(analysis.timeframe)}
              className="w-full p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-text-primary">
                  {getTimeframeLabel(analysis.timeframe)}
                </span>
                {analysis.verifiedDate && (
                  <CheckCircle2 className="w-4 h-4 text-accent-primary" />
                )}
              </div>
              {expanded[analysis.timeframe] ? (
                <ChevronUp className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              )}
            </button>

            {expanded[analysis.timeframe] && (
              <div className="px-4 pb-4 pt-2 border-t border-border">
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {analysis.analysis}
                </p>
              </div>
            )}

            {!expanded[analysis.timeframe] && (
              <div className="px-4 pb-4 pt-2 border-t border-border">
                <p className="text-sm text-text-secondary line-clamp-2">
                  {analysis.analysis}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

