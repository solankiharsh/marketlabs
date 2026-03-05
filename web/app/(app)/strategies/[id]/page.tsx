'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Square } from 'lucide-react';
import {
  getStrategyDetail,
  getStrategyTrades,
  getStrategyPositions,
  getEquityCurve,
  getStrategyNotifications,
  startStrategy,
  stopStrategy,
  markNotificationRead,
} from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function StrategyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [trades, setTrades] = useState<unknown[]>([]);
  const [positions, setPositions] = useState<unknown[]>([]);
  const [equityCurve, setEquityCurve] = useState<{ time: number; equity: number }[]>([]);
  const [notifications, setNotifications] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    if (!id || Number.isNaN(id)) return;
    setLoading(true);
    Promise.all([
      getStrategyDetail(id),
      getStrategyTrades(id),
      getStrategyPositions(id),
      getEquityCurve(id),
      getStrategyNotifications({ strategyId: id, limit: 50 }),
    ])
      .then(([d, t, p, e, n]) => {
        setDetail(d);
        setTrades((t.trades ?? t.items ?? []) as unknown[]);
        setPositions((p.positions ?? p.items ?? []) as unknown[]);
        setEquityCurve(
          (e.points ?? []).map((pt: { time: number; equity: number }) => ({
            time: pt.time,
            equity: pt.equity,
          }))
        );
        setNotifications((n.items ?? []) as unknown[]);
      })
      .catch(() => {
        setDetail(null);
        setTrades([]);
        setPositions([]);
        setEquityCurve([]);
        setNotifications([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const status = String(detail?.status ?? '').toLowerCase();
  const handleStart = async () => {
    setActionLoading(true);
    try {
      await startStrategy(id);
      toast.success('Strategy started');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      await stopStrategy(id);
      toast.success('Strategy stopped');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to stop');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkRead = async (notificationId: number) => {
    try {
      await markNotificationRead(notificationId);
      load();
    } catch {
      // ignore
    }
  };

  if (loading && !detail) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-text-muted">Loading strategy...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <p className="text-error">Strategy not found.</p>
        <Link href="/strategies" className="text-accent-primary hover:underline">
          Back to Strategies
        </Link>
      </div>
    );
  }

  const tradeColumns: Column<Record<string, unknown>>[] = [
    { key: 'symbol', header: 'Symbol' },
    { key: 'type', header: 'Type', render: (r) => <Badge variant={String(r.type).toLowerCase() === 'buy' ? 'success' : 'error'}>{String(r.type ?? '—')}</Badge> },
    { key: 'price', header: 'Price', render: (r) => (typeof r.price === 'number' ? r.price.toLocaleString() : String(r.price ?? '—')) },
    { key: 'amount', header: 'Amount', render: (r) => (typeof r.amount === 'number' ? r.amount.toLocaleString() : String(r.amount ?? '—')) },
    { key: 'profit', header: 'Profit', render: (r) => (typeof r.profit === 'number' ? r.profit.toLocaleString() : String(r.profit ?? '—')) },
    { key: 'created_at', header: 'Time', render: (r) => (r.created_at ? new Date(Number(r.created_at) * 1000).toLocaleString() : '—') },
  ];

  const positionColumns: Column<Record<string, unknown>>[] = [
    { key: 'symbol', header: 'Symbol' },
    { key: 'side', header: 'Side' },
    { key: 'size', header: 'Size', render: (r) => (typeof r.size === 'number' ? r.size.toLocaleString() : String(r.size ?? '—')) },
    { key: 'entry_price', header: 'Entry', render: (r) => (typeof r.entry_price === 'number' ? r.entry_price.toLocaleString() : String(r.entry_price ?? '—')) },
    { key: 'current_price', header: 'Current', render: (r) => (typeof r.current_price === 'number' ? r.current_price.toLocaleString() : String(r.current_price ?? '—')) },
    { key: 'unrealized_pnl', header: 'PnL', render: (r) => (typeof r.unrealized_pnl === 'number' ? r.unrealized_pnl.toLocaleString() : String(r.unrealized_pnl ?? '—')) },
  ];

  const chartData = equityCurve.map((pt) => ({
    time: new Date(pt.time * 1000).toLocaleDateString(),
    equity: pt.equity,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/strategies" className="p-2 hover:bg-white/5 rounded" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-bold truncate">{String(detail.name ?? 'Strategy')}</h1>
          <p className="text-sm text-text-muted">
            {String(detail.symbol ?? '')} · {String(detail.market ?? '')}
          </p>
        </div>
        <Badge variant={status === 'running' ? 'success' : 'muted'}>{String(detail.status ?? '—')}</Badge>
        {status === 'running' ? (
          <button
            type="button"
            onClick={handleStop}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated text-sm"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-accent-primary/40 bg-accent-primary/20 text-accent-primary text-sm"
          >
            <Play className="h-4 w-4" />
            Start
          </button>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-lg font-semibold mb-4">Equity curve</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-white/10" />
                <XAxis dataKey="time" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                <Area type="monotone" dataKey="equity" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="positions">
          <DataTable
            columns={positionColumns}
            data={positions as Record<string, unknown>[]}
            keyExtractor={(r) => String((r as Record<string, unknown>).id ?? Math.random())}
            emptyMessage="No positions"
          />
        </TabsContent>
        <TabsContent value="trades">
          <DataTable
            columns={tradeColumns}
            data={trades as Record<string, unknown>[]}
            keyExtractor={(r) => String((r as Record<string, unknown>).id ?? Math.random())}
            emptyMessage="No trades"
          />
        </TabsContent>
        <TabsContent value="notifications">
          <ul className="space-y-2">
            {notifications.length === 0 ? (
              <li className="text-text-muted text-sm">No notifications</li>
            ) : (
              (notifications as Record<string, unknown>[]).map((n) => (
                <li
                  key={String(n.id)}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm"
                >
                  <span className={n.read ? 'text-text-muted' : 'text-text-primary'}>{String(n.message ?? n.content ?? '—')}</span>
                  {n.id != null && !n.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(Number(n.id))}
                      className="text-accent-primary hover:underline text-xs"
                    >
                      Mark read
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}
