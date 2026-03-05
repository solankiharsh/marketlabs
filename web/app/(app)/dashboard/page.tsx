'use client';

import { useEffect, useState } from 'react';
import { LayoutDashboard } from 'lucide-react';
import {
  getDashboardSummary,
  getPendingOrders,
  deletePendingOrder,
  type DashboardSummary,
} from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { EChartsLine } from '@/components/charts/EChartsLine';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pendingOrders, setPendingOrders] = useState<{ items: unknown[]; total?: number }>({
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = () => {
    setLoading(true);
    setError(null);
    Promise.all([getDashboardSummary(), getPendingOrders(1, 20)])
      .then(([s, o]) => {
        setSummary(s);
        setPendingOrders(o);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
        setSummary(null);
        setPendingOrders({ items: [] });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleDeleteOrder = async (orderId: string | number) => {
    try {
      await deletePendingOrder(orderId);
      toast.success('Order cancelled');
      loadDashboard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete order');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-text-muted">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8 text-accent-primary" />
          Dashboard
        </h1>
        <p className="text-error">{error}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalStrategies = (summary?.ai_strategy_count ?? 0) + (summary?.indicator_strategy_count ?? 0);
  const dailyChart = summary?.daily_pnl_chart ?? [];

  const recentTrades = (summary?.recent_trades ?? []).slice(0, 10);
  const tradeColumns: Column<Record<string, unknown>>[] = [
    { key: 'strategy_name', header: 'Strategy' },
    { key: 'symbol', header: 'Symbol' },
    {
      key: 'type',
      header: 'Type',
      render: (r) => <Badge variant={String(r.type).toLowerCase() === 'buy' ? 'success' : 'error'}>{String(r.type ?? '—')}</Badge>,
    },
    { key: 'price', header: 'Price', render: (r) => (typeof r.price === 'number' ? r.price.toLocaleString() : String(r.price ?? '—')) },
    { key: 'amount', header: 'Amount', render: (r) => (typeof r.amount === 'number' ? r.amount.toLocaleString() : String(r.amount ?? '—')) },
    { key: 'profit', header: 'Profit', render: (r) => (typeof r.profit === 'number' ? r.profit.toLocaleString() : String(r.profit ?? '—')) },
  ];

  const positionColumns: Column<Record<string, unknown>>[] = [
    { key: 'strategy_name', header: 'Strategy' },
    { key: 'symbol', header: 'Symbol' },
    { key: 'side', header: 'Side' },
    { key: 'size', header: 'Size', render: (r) => (typeof r.size === 'number' ? r.size.toLocaleString() : String(r.size ?? '—')) },
    { key: 'entry_price', header: 'Entry', render: (r) => (typeof r.entry_price === 'number' ? r.entry_price.toLocaleString() : String(r.entry_price ?? '—')) },
    { key: 'current_price', header: 'Current', render: (r) => (typeof r.current_price === 'number' ? r.current_price.toLocaleString() : String(r.current_price ?? '—')) },
    { key: 'unrealized_pnl', header: 'PnL', render: (r) => (typeof r.unrealized_pnl === 'number' ? r.unrealized_pnl.toLocaleString() : String(r.unrealized_pnl ?? '—')) },
  ];

  const pendingColumns: Column<Record<string, unknown>>[] = [
    { key: 'strategy_name', header: 'Strategy' },
    { key: 'symbol', header: 'Symbol' },
    { key: 'side', header: 'Side' },
    { key: 'order_type', header: 'Type' },
    { key: 'price', header: 'Price', render: (r) => (typeof r.price === 'number' ? r.price.toLocaleString() : String(r.price ?? '—')) },
    { key: 'amount', header: 'Amount', render: (r) => (typeof r.amount === 'number' ? r.amount.toLocaleString() : String(r.amount ?? '—')) },
    {
      key: 'id',
      header: '',
      render: (r) =>
        r.id != null ? (
          <button
            type="button"
            onClick={() => handleDeleteOrder(r.id as number)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Cancel
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold flex items-center gap-2">
        <LayoutDashboard className="h-8 w-8 text-accent-primary" />
        Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total strategies"
          value={totalStrategies}
          changeLabel={`${summary?.indicator_strategy_count ?? 0} indicator, ${summary?.ai_strategy_count ?? 0} AI`}
        />
        <StatCard
          title="Total equity"
          value={typeof summary?.total_equity === 'number' ? summary.total_equity.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
        />
        <StatCard
          title="Total PnL"
          value={typeof summary?.total_pnl === 'number' ? summary.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
          change={summary?.total_pnl != null && summary?.total_equity != null && summary.total_equity > 0
            ? (summary.total_pnl / summary.total_equity) * 100
            : undefined
          }
        />
        <StatCard
          title="Pending orders"
          value={pendingOrders.items.length}
        />
      </div>

      {dailyChart.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-lg font-semibold mb-4">Daily PnL</h3>
          <EChartsLine
            data={dailyChart as Record<string, string | number>[]}
            series={[{ name: 'Profit', dataKey: 'profit', type: 'area', color: 'var(--accent-primary)' }]}
            xAxisKey="date"
            height={256}
            theme="dark"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Recent trades</h3>
          <DataTable
            columns={tradeColumns}
            data={recentTrades}
            keyExtractor={(r) => String((r as Record<string, unknown>).id ?? Math.random())}
            emptyMessage="No recent trades"
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Current positions</h3>
          <DataTable
            columns={positionColumns}
            data={summary?.current_positions ?? []}
            keyExtractor={(r) => String((r as Record<string, unknown>).id ?? (r as Record<string, unknown>).symbol ?? Math.random())}
            emptyMessage="No open positions"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Pending orders</h3>
        <DataTable
          columns={pendingColumns}
          data={pendingOrders.items as Record<string, unknown>[]}
          keyExtractor={(r) => String(r.id ?? Math.random())}
          emptyMessage="No pending orders"
        />
      </div>
    </div>
  );
}
