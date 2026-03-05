'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Play, Square, Trash2 } from 'lucide-react';
import {
  getStrategies,
  batchStartStrategies,
  batchStopStrategies,
  batchDeleteStrategies,
  type StrategyItem,
} from '@/lib/api';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    getStrategies()
      .then(setStrategies)
      .catch(() => setStrategies([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === strategies.length) setSelected(new Set());
    else setSelected(new Set(strategies.map((s) => s.id)));
  };

  const handleBatchStart = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    try {
      await batchStartStrategies(Array.from(selected));
      toast.success('Strategies started');
      setSelected(new Set());
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchStop = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    try {
      await batchStopStrategies(Array.from(selected));
      toast.success('Strategies stopped');
      setSelected(new Set());
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to stop');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} strategy(ies)?`)) return;
    setActionLoading(true);
    try {
      await batchDeleteStrategies(Array.from(selected));
      toast.success('Strategies deleted');
      setSelected(new Set());
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<StrategyItem>[] = [
    {
      key: '_select',
      header: (
        <input
          type="checkbox"
          checked={strategies.length > 0 && selected.size === strategies.length}
          onChange={selectAll}
          className="rounded border-border"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selected.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          className="rounded border-border"
        />
      ),
    },
    { key: 'name', header: 'Name' },
    { key: 'symbol', header: 'Symbol' },
    { key: 'market', header: 'Market' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            String(row.status).toLowerCase() === 'running'
              ? 'success'
              : 'muted'
          }
        >
          {String(row.status ?? '—')}
        </Badge>
      ),
    },
    {
      key: 'pnl',
      header: 'PnL',
      render: (row) =>
        typeof row.pnl === 'number'
          ? row.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })
          : '—',
    },
    {
      key: '_view',
      header: '',
      render: (row) => (
        <Link
          href={`/strategies/${row.id}`}
          className="text-accent-primary hover:underline text-sm"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold">Strategies</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <button
                type="button"
                onClick={handleBatchStart}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated text-sm"
              >
                <Play className="h-4 w-4" />
                Start ({selected.size})
              </button>
              <button
                type="button"
                onClick={handleBatchStop}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated text-sm"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          )}
          <Link
            href="/strategies/create"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium hover:bg-accent-primary/30 text-sm"
          >
            <Plus className="h-4 w-4" />
            Create Strategy
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-text-muted">Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={strategies}
          keyExtractor={(r) => r.id}
          emptyMessage="No strategies. Create one to get started."
        />
      )}
    </div>
  );
}
