'use client';

import { Wallet, BarChart3, TrendingUp } from 'lucide-react';

interface StrategySummaryCardsProps {
  detail: Record<string, unknown>;
}

function formatMoney(val: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function StrategySummaryCards({ detail }: StrategySummaryCardsProps) {
  const tradingConfig = (detail.trading_config as Record<string, unknown>) ?? {};
  const initialCapital = Number(
    detail.initial_capital ?? tradingConfig.initial_capital ?? 1000
  );
  const currentEquity = Number(
    detail.current_equity ?? tradingConfig.current_equity ?? initialCapital
  );
  const totalPnl = Number(detail.total_pnl ?? detail.pnl ?? tradingConfig.total_pnl ?? 0);
  const totalPnlPct =
    initialCapital > 0 ? (totalPnl / initialCapital) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
          <Wallet className="h-4 w-4" />
          Total Investment
        </div>
        <p className="text-lg font-semibold text-text-primary tabular-nums">
          {formatMoney(initialCapital)}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
          <BarChart3 className="h-4 w-4" />
          Current Equity
        </div>
        <p className="text-lg font-semibold text-text-primary tabular-nums">
          {formatMoney(currentEquity)}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
          <TrendingUp className="h-4 w-4" />
          Total P&L
        </div>
        <p
          className={`text-lg font-semibold tabular-nums ${
            totalPnl >= 0 ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {totalPnl >= 0 ? '+' : ''}
          {formatMoney(totalPnl)} ({totalPnl >= 0 ? '+' : ''}
          {totalPnlPct.toFixed(2)}%)
        </p>
      </div>
    </div>
  );
}
