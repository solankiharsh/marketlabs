'use client';

import { useState, useEffect } from 'react';
import { getCreditsHistory } from '@/lib/api/profile-membership';
import type { CreditTransaction } from '@/lib/api/profile-membership';

export function TabCreditsHistory() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    getCreditsHistory(page, limit)
      .then((res) => {
        setTransactions(res.transactions);
        setTotal(res.total);
      })
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [page]);

  const typeBadgeClass = (type: string) => {
    if (type === 'Consume') return 'bg-red-500/20 text-red-400 border border-red-500/40';
    if (type === 'Register Bonus') return 'bg-green-500/20 text-green-400 border border-green-500/40';
    if (type === 'Top Up') return 'bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/40';
    if (type === 'Referral Bonus') return 'bg-teal-500/20 text-teal-400 border border-teal-500/40';
    return 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]';
  };

  if (loading && transactions.length === 0) {
    return <p className="text-[var(--text-muted)]">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Time</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Type</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Change</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Balance</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Remark</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 text-[var(--text-primary)]">{tx.time}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${typeBadgeClass(tx.type)}`}>
                    {tx.type}
                  </span>
                </td>
                <td className={`px-4 py-3 font-mono ${tx.change >= 0 ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`}>
                  {tx.change >= 0 ? '+' : ''}{tx.change.toFixed(2)}
                </td>
                <td className="px-4 py-3 font-mono text-[var(--text-primary)]">{tx.balance.toFixed(2)}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-[var(--text-secondary)]">{tx.remark ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > limit && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] disabled:opacity-50 hover:bg-[var(--bg-input)]"
          >
            &lt;
          </button>
          <span className="flex items-center px-2 text-sm text-[var(--text-muted)]">
            {page}
          </span>
          <button
            type="button"
            disabled={page * limit >= total}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] disabled:opacity-50 hover:bg-[var(--bg-input)]"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}
