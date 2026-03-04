'use client';

import { useState } from 'react';
import React from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { MarketScan } from '@/lib/api';
import { AnalysisCard } from './AnalysisCard';

interface IndicatorTableProps {
  scans: MarketScan[];
  loading: boolean;
}

export function IndicatorTable({ scans, loading }: IndicatorTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (loading && scans.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-muted">Loading market data...</div>
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-muted">No market data available</div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 50) return 'text-accent-primary';
    if (score >= 30) return 'text-warning';
    return 'text-error';
  };

  const getSetupIcon = (setupType?: string) => {
    if (setupType === 'bullish') return <TrendingUp className="w-4 h-4 text-success" />;
    if (setupType === 'bearish') return <TrendingDown className="w-4 h-4 text-error" />;
    return <Minus className="w-4 h-4 text-text-muted" />;
  };

  // Helper to safely convert Decimal/string/number to number
  const toNumber = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    // Handle Prisma Decimal type (has toString method)
    if (typeof value === 'object' && 'toString' in value) {
      const num = parseFloat(value.toString());
      return isNaN(num) ? null : num;
    }
    return null;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-muted">Rank</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-muted">Asset</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-text-muted">Score</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-text-muted">RSI</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-text-muted">MACD</th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-text-muted">Trend</th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-text-muted">Setup</th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-text-muted"></th>
          </tr>
        </thead>
        <tbody>
          {scans.map((scan) => (
            <React.Fragment key={scan.id}>
              <tr
                className="border-b border-border/50 hover:bg-white/[0.02] cursor-pointer transition-colors"
                onClick={() => setExpandedRow(expandedRow === scan.id ? null : scan.id)}
              >
                <td className="py-3 px-4">
                  <div className="text-sm font-mono text-text-muted">#{scan.rank || '—'}</div>
                </td>
                <td className="py-3 px-4">
                  <Link
                    href={`/market/${scan.asset.symbol}`}
                    className="hover:text-accent-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="font-semibold">{scan.asset.displayName}</div>
                    <div className="text-xs text-text-muted">{scan.asset.symbol}</div>
                  </Link>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className={`text-sm font-bold ${getScoreColor(toNumber(scan.score) || 0)}`}>
                    {toNumber(scan.score)?.toFixed(0) || '—'}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="text-sm font-mono">
                    {toNumber(scan.rsi)?.toFixed(1) || '—'}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="text-sm font-mono">
                    {toNumber(scan.macd)?.toFixed(4) || '—'}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  {getSetupIcon(scan.setupType)}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-xs px-2 py-1 rounded ${
                    scan.setupType === 'bullish'
                      ? 'bg-success/10 text-success'
                      : scan.setupType === 'bearish'
                      ? 'bg-error/10 text-error'
                      : 'bg-text-muted/10 text-text-muted'
                  }`}>
                    {scan.setupType?.toUpperCase() || 'NEUTRAL'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <ChevronRight
                    className={`w-4 h-4 text-text-muted transition-transform ${
                      expandedRow === scan.id ? 'rotate-90' : ''
                    }`}
                  />
                </td>
              </tr>
              {expandedRow === scan.id && (
                <tr>
                  <td colSpan={8} className="p-4 bg-white/[0.02]">
                    <AnalysisCard scan={scan} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

