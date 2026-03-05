'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import { getExchanges, deleteExchange, testExchange } from '@/lib/api/profile-membership';
import type { ExchangeAccount } from '@/lib/api/profile-membership';
import { AddExchangeModal } from './AddExchangeModal';
import { toast } from 'sonner';

export function TabExchangeConfig() {
  const [list, setList] = useState<ExchangeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    getExchanges()
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const handleTest = async (id: string) => {
    try {
      const res = await testExchange(id);
      if (res.status === 'success') toast.success('Connection successful');
      else toast.error(res.message ?? 'Connection failed');
    } catch {
      toast.error('Test failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this exchange account?')) return;
    try {
      await deleteExchange(id);
      toast.success('Removed');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Manage your exchange API keys and broker connections. They can be used in Trading Assistant and Quick Trade.
      </p>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Exchange</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Name</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Connection Info</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Created</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--text-muted)]">Loading...</td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  <FileText className="mx-auto h-10 w-10 opacity-50" />
                  <p className="mt-2 font-medium">No Data</p>
                  <p className="mt-1 text-sm">No exchange accounts yet. Click the button above to add one.</p>
                </td>
              </tr>
            ) : (
              list.map((acc) => (
                <tr key={acc.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 text-[var(--text-primary)]">{acc.exchange}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{acc.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{acc.connection_info ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{acc.created_at ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleTest(acc.id)}
                      className="mr-2 rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(acc.id)}
                      className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--cta-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--cta-hover)]"
      >
        <Plus className="h-4 w-4" />
        Add Exchange Account
      </button>
      <AddExchangeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); load(); }}
      />
    </div>
  );
}
