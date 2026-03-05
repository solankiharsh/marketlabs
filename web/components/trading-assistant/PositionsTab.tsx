'use client';

import { DataTable, type Column } from '@/components/ui/DataTable';

interface PositionsTabProps {
  strategyId: number;
  positions: unknown[];
  onRefresh: () => void;
}

export function PositionsTab({ positions }: PositionsTabProps) {
  const rows = (positions ?? []) as Record<string, unknown>[];

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'symbol', header: 'Symbol' },
    { key: 'side', header: 'Side' },
    {
      key: 'entry_price',
      header: 'Entry',
      render: (r) =>
        typeof r.entry_price === 'number'
          ? r.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 })
          : String(r.entry_price ?? '—'),
    },
    {
      key: 'current_price',
      header: 'Current',
      render: (r) =>
        typeof r.current_price === 'number'
          ? r.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })
          : String(r.current_price ?? '—'),
    },
    {
      key: 'size',
      header: 'Qty',
      render: (r) =>
        typeof r.size === 'number'
          ? r.size.toLocaleString(undefined, { minimumFractionDigits: 4 })
          : String(r.size ?? '—'),
    },
    {
      key: 'unrealized_pnl',
      header: 'P&L',
      render: (r) => {
        const v = r.unrealized_pnl ?? r.pnl;
        if (typeof v !== 'number') return String(v ?? '—');
        return (
          <span className={v >= 0 ? 'text-green-500' : 'text-red-500'}>
            {v >= 0 ? '+' : ''}
            {v.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'pnl_percent',
      header: 'P&L%',
      render: (r) => {
        const v = r.pnl_percent ?? r.pnl_pct;
        if (typeof v !== 'number') return String(v ?? '—');
        return (
          <span className={v >= 0 ? 'text-green-500' : 'text-red-500'}>
            {v >= 0 ? '+' : ''}
            {v.toFixed(2)}%
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      keyExtractor={(r) => String(r.id ?? (r as object).toString?.() ?? Math.random())}
      emptyMessage="No positions"
    />
  );
}
