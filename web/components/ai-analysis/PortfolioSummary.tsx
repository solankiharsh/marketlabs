'use client';

import { Wallet, RefreshCw } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import type { PortfolioPosition, PortfolioSummaryData } from '@/lib/api/portfolio-types';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryData;
  positions: PortfolioPosition[];
  lastSync: Date | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function PortfolioSummary({ summary, positions, lastSync, onRefresh, isRefreshing }: PortfolioSummaryProps) {
  const totalValue = summary.market_value ?? 0;
  const totalCost = summary.total_cost ?? 0;
  const totalPnl = summary.total_pnl ?? 0;
  const totalPnlPercent = summary.total_pnl_percent ?? (totalCost > 0 ? (totalPnl / totalCost) * 100 : 0);
  const positionsCount = positions.length;

  const todayPnl = positions.reduce((acc, p) => {
    const change = (p.price_change_percent ?? 0) / 100;
    const mv = p.market_value ?? (p.current_price ?? 0) * p.quantity;
    return acc + mv * change;
  }, 0);

  const withPnl = positions.filter((p) => p.pnl_percent != null && !Number.isNaN(p.pnl_percent));
  const best = withPnl.length
    ? withPnl.reduce((a, b) => ((a.pnl_percent ?? -Infinity) > (b.pnl_percent ?? -Infinity) ? a : b))
    : null;
  const worst = withPnl.length
    ? withPnl.reduce((a, b) => ((a.pnl_percent ?? Infinity) < (b.pnl_percent ?? Infinity) ? a : b))
    : null;

  const lastSyncLabel = lastSync ? (() => {
    const sec = Math.floor((Date.now() - lastSync.getTime()) / 1000);
    if (sec < 60) return 'Just now';
    if (sec < 120) return '1 min ago';
    return `${Math.floor(sec / 60)} min ago`;
  })() : '—';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg bg-gradient-to-r from-purple-500 to-violet-500 p-4 text-white shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 opacity-90" />
            <p className="text-sm font-medium opacity-90">Total Value</p>
          </div>
          <p className="mt-1 text-2xl font-semibold font-mono tabular-nums">{formatCurrency(totalValue)}</p>
        </div>
        <StatCard title="Total Cost" value={formatCurrency(totalCost)} />
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-text-muted">Total P&L</p>
          <p className={`mt-1 text-2xl font-semibold font-mono tabular-nums ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
          </p>
          <p className={`mt-1 text-sm font-medium ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercent(totalPnlPercent)}
          </p>
        </div>
        <StatCard title="Positions" value={positionsCount}>
          <p className="text-xs text-text-muted mt-1">Profit/Loss</p>
        </StatCard>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-text-muted">Today P&L</p>
          <p className={`mt-1 text-2xl font-semibold font-mono tabular-nums ${todayPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(todayPnl)}
          </p>
        </div>
        <StatCard
          title="Best Performer"
          value={best ? `${best.symbol} (${formatPercent(best.pnl_percent ?? 0)})` : '—'}
        />
        <StatCard
          title="Worst Performer"
          value={worst ? `${worst.symbol} (${formatPercent(worst.pnl_percent ?? 0)})` : '—'}
        />
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-5 w-5 text-text-muted ${isRefreshing ? 'animate-spin' : ''}`} />
                <p className="text-sm font-medium text-text-muted">Price Sync</p>
              </div>
              <p className="mt-1 text-2xl font-semibold text-text-primary font-mono tabular-nums">{lastSyncLabel}</p>
              <p className="text-xs text-text-muted mt-1">Refresh: 30s</p>
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg border border-border text-text-muted hover:bg-bg-elevated hover:text-text-primary disabled:opacity-50"
                aria-label="Refresh prices"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
