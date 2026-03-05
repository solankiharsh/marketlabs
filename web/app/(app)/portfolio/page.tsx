'use client';

import { useEffect, useState } from 'react';
import {
  getPortfolioPositions,
  getPortfolioSummary,
  getPortfolioGroups,
  addPosition,
  deletePosition,
  getMonitors,
  getAlerts,
} from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { toast } from 'sonner';

export default function PortfolioPage() {
  const [positions, setPositions] = useState<unknown[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [groups, setGroups] = useState<string[]>([]);
  const [monitors, setMonitors] = useState<unknown[]>([]);
  const [alerts, setAlerts] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      getPortfolioPositions().then(setPositions).catch(() => []),
      getPortfolioSummary().then(setSummary).catch(() => ({})),
      getPortfolioGroups().then(setGroups).catch(() => []),
      getMonitors().then(setMonitors).catch(() => []),
      getAlerts().then(setAlerts).catch(() => []),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDeletePosition = async (id: number) => {
    try {
      await deletePosition(id);
      toast.success('Position removed');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const positionColumns: Column<Record<string, unknown>>[] = [
    { key: 'group_name', header: 'Group' },
    { key: 'symbol', header: 'Symbol' },
    { key: 'side', header: 'Side' },
    { key: 'quantity', header: 'Qty', render: (r) => (typeof r.quantity === 'number' ? r.quantity.toLocaleString() : String(r.quantity ?? '—')) },
    { key: 'entry_price', header: 'Entry', render: (r) => (typeof r.entry_price === 'number' ? r.entry_price.toLocaleString() : String(r.entry_price ?? '—')) },
    { key: 'market_value', header: 'Value', render: (r) => (typeof r.market_value === 'number' ? r.market_value.toLocaleString() : String(r.market_value ?? '—')) },
    { key: 'pnl', header: 'PnL', render: (r) => (typeof r.pnl === 'number' ? r.pnl.toLocaleString() : String(r.pnl ?? '—')) },
    {
      key: 'id',
      header: '',
      render: (r) =>
        r.id != null ? (
          <button
            type="button"
            onClick={() => handleDeletePosition(r.id as number)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        ) : null,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-text-muted">Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Portfolio</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total cost"
          value={typeof summary.total_cost === 'number' ? summary.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
        />
        <StatCard
          title="Market value"
          value={typeof summary.market_value === 'number' ? summary.market_value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
        />
        <StatCard
          title="PnL"
          value={typeof summary.total_pnl === 'number' ? summary.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
        />
        <StatCard
          title="Positions"
          value={positions.length}
        />
      </div>

      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="monitors">Monitors</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="positions">
          <DataTable
            columns={positionColumns}
            data={positions as Record<string, unknown>[]}
            keyExtractor={(r) => String(r.id ?? r.symbol ?? Math.random())}
            emptyMessage="No positions. Add positions to track."
          />
        </TabsContent>
        <TabsContent value="monitors">
          <p className="text-text-muted text-sm">
            {monitors.length === 0 ? 'No monitors.' : `${monitors.length} monitor(s).`}
          </p>
        </TabsContent>
        <TabsContent value="alerts">
          <p className="text-text-muted text-sm">
            {alerts.length === 0 ? 'No alerts.' : `${alerts.length} alert(s).`}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
