'use client';

import { useState, useMemo } from 'react';
import { LayoutGrid, List, TrendingUp, FileText } from 'lucide-react';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import type { PortfolioPosition } from '@/lib/api/portfolio-types';

interface PositionsListProps {
  positions: PortfolioPosition[];
  groups: string[];
  onAddClick: () => void;
  onEdit?: (position: PortfolioPosition) => void;
  onDelete: (id: number) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function PositionsList({ positions, groups, onAddClick, onEdit, onDelete }: PositionsListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('symbol');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    let list = groupFilter === 'all' ? positions : positions.filter((p) => (p.group_name ?? '') === groupFilter);
    list = [...list].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortKey];
      const bVal = (b as unknown as Record<string, unknown>)[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return list;
  }, [positions, groupFilter, sortKey, sortDir]);

  const columns: Column<PortfolioPosition>[] = [
    { key: 'symbol', header: 'Symbol', render: (r) => <span className="font-medium">{r.symbol}</span> },
    { key: 'market', header: 'Market', render: (r) => <Badge variant="muted">{r.market}</Badge> },
    { key: 'side', header: 'Side', render: (r) => <Badge variant={r.side === 'long' ? 'success' : 'error'}>{r.side}</Badge> },
    { key: 'quantity', header: 'Qty', render: (r) => <span className="font-mono tabular-nums">{r.quantity.toLocaleString()}</span> },
    { key: 'entry_price', header: 'Entry', render: (r) => <span className="font-mono tabular-nums">{formatCurrency(r.entry_price)}</span> },
    { key: 'current_price', header: 'Current', render: (r) => <span className="font-mono tabular-nums">{r.current_price != null ? formatCurrency(r.current_price) : '—'}</span> },
    { key: 'pnl', header: 'P&L $', render: (r) => <span className={`font-mono tabular-nums ${(r.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{r.pnl != null ? formatCurrency(r.pnl) : '—'}</span> },
    { key: 'pnl_percent', header: 'P&L %', render: (r) => <span className={`font-mono tabular-nums ${(r.pnl_percent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{r.pnl_percent != null ? formatPercent(r.pnl_percent) : '—'}</span> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-2">
          {onEdit && (
            <button type="button" onClick={() => onEdit(r)} className="text-xs text-accent-primary hover:underline">
              Edit
            </button>
          )}
          <button type="button" onClick={() => onDelete(r.id)} className="text-xs text-red-400 hover:text-red-300">
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-text-muted" />
          <h2 className="text-lg font-semibold text-text-primary">My Positions</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40' : 'bg-bg-secondary text-text-muted hover:text-text-primary'}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40' : 'bg-bg-secondary text-text-muted hover:text-text-primary'}`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary"
          >
            <option value="all">All Positions</option>
            {groups.map((g) => (
              <option key={g} value={g}>{g || '(No group)'}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onAddClick}
            className="rounded-lg bg-accent-primary/20 border border-accent-primary/40 px-3 py-2 text-sm font-medium text-accent-primary hover:bg-accent-primary/30 transition-all"
          >
            + Add Position
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-text-muted mb-3" />
          <p className="text-text-primary font-medium">No positions yet</p>
          <button
            type="button"
            onClick={onAddClick}
            className="mt-3 rounded-lg bg-accent-primary/20 border border-accent-primary/40 px-4 py-2 text-sm font-medium text-accent-primary hover:bg-accent-primary/30"
          >
            + Add Your First Position
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-bg-secondary p-4 transition-all duration-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-text-primary">{p.symbol}</span>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="muted">{p.market}</Badge>
                    <Badge variant={p.side === 'long' ? 'success' : 'error'}>{p.side}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  {onEdit && (
                    <button type="button" onClick={() => onEdit(p)} className="text-xs text-accent-primary hover:underline">
                      Edit
                    </button>
                  )}
                  <button type="button" onClick={() => onDelete(p.id)} className="text-xs text-red-400 hover:text-red-300">
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <span className="text-text-muted">Qty</span>
                <span className="font-mono tabular-nums text-right">{p.quantity.toLocaleString()}</span>
                <span className="text-text-muted">Entry</span>
                <span className="font-mono tabular-nums text-right">{formatCurrency(p.entry_price)}</span>
                <span className="text-text-muted">Current</span>
                <span className="font-mono tabular-nums text-right">{p.current_price != null ? formatCurrency(p.current_price) : '—'}</span>
                <span className="text-text-muted">P&L</span>
                <span className={`font-mono tabular-nums text-right ${(p.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {p.pnl != null ? formatCurrency(p.pnl) : '—'} ({p.pnl_percent != null ? formatPercent(p.pnl_percent) : '—'})
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(r) => String(r.id)}
          emptyMessage="No positions match the filter."
        />
      )}
    </div>
  );
}
