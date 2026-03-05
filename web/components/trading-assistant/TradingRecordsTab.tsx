'use client';

import { DataTable, type Column } from '@/components/ui/DataTable';

interface TradingRecordsTabProps {
  trades: unknown[];
}

export function TradingRecordsTab({ trades }: TradingRecordsTabProps) {
  const rows = (trades ?? []) as Record<string, unknown>[];

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'symbol', header: 'Symbol' },
    { key: 'type', header: 'Side', render: (r) => String(r.type ?? r.side ?? '—') },
    {
      key: 'price',
      header: 'Entry',
      render: (r) =>
        typeof r.price === 'number'
          ? r.price.toLocaleString(undefined, { minimumFractionDigits: 2 })
          : typeof r.entry_price === 'number'
            ? r.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 })
            : String(r.entry_price ?? r.price ?? '—'),
    },
    {
      key: 'exit_price',
      header: 'Exit',
      render: (r) =>
        typeof r.exit_price === 'number'
          ? r.exit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })
          : String(r.exit_price ?? '—'),
    },
    {
      key: 'amount',
      header: 'Qty',
      render: (r) =>
        typeof r.amount === 'number'
          ? r.amount.toLocaleString(undefined, { minimumFractionDigits: 4 })
          : typeof r.quantity === 'number'
            ? r.quantity.toLocaleString(undefined, { minimumFractionDigits: 4 })
            : String(r.quantity ?? r.amount ?? '—'),
    },
    {
      key: 'profit',
      header: 'P&L',
      render: (r) => {
        const v = r.profit ?? r.pnl;
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
      key: 'reason',
      header: 'Reason',
      render: (r) => String(r.reason ?? '—'),
    },
    {
      key: 'created_at',
      header: 'Time',
      render: (r) => {
        const t = r.created_at ?? r.closed_at;
        if (t == null) return '—';
        const ts = typeof t === 'number' ? t : new Date(String(t)).getTime() / 1000;
        return new Date(ts * 1000).toLocaleString();
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      keyExtractor={(r) => String(r.id ?? (r as object).toString?.() ?? Math.random())}
      emptyMessage="No trading records"
    />
  );
}
