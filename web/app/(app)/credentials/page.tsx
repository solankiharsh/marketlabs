'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { getCredentials, createCredential, deleteCredential } from '@/lib/api';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { toast } from 'sonner';

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<{ id: number; name?: string; exchange_id?: string; api_key_hint?: string; created_at?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    exchange_id: 'binance',
    api_key: '',
    secret_key: '',
    passphrase: '',
    demo: false,
  });

  const load = () => {
    setLoading(true);
    getCredentials()
      .then(setCredentials)
      .catch(() => setCredentials([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.exchange_id || !form.api_key || !form.secret_key) {
      toast.error('Exchange, API key, and secret are required');
      return;
    }
    try {
      await createCredential({
        name: form.name || undefined,
        exchange_id: form.exchange_id,
        api_key: form.api_key,
        secret_key: form.secret_key,
        passphrase: form.passphrase || undefined,
        demo: form.demo,
      });
      toast.success('Credential added');
      setOpen(false);
      setForm({ name: '', exchange_id: 'binance', api_key: '', secret_key: '', passphrase: '', demo: false });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this credential?')) return;
    try {
      await deleteCredential(id);
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const columns: Column<{ id: number; name?: string; exchange_id?: string; api_key_hint?: string; created_at?: string }>[] = [
    { key: 'name', header: 'Name' },
    { key: 'exchange_id', header: 'Exchange' },
    { key: 'api_key_hint', header: 'API key' },
    { key: 'created_at', header: 'Created', render: (r) => (r.created_at ? new Date(String(r.created_at)).toLocaleDateString() : '—') },
    {
      key: 'id',
      header: '',
      render: (r) => (
        <button
          type="button"
          onClick={() => handleDelete(r.id)}
          className="text-red-400 hover:text-red-300 text-sm"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Credentials</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium hover:bg-accent-primary/30 text-sm">
              Add Credential
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add credential</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
                  placeholder="My exchange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Exchange</label>
                <select
                  value={form.exchange_id}
                  onChange={(e) => setForm((f) => ({ ...f, exchange_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
                >
                  <option value="binance">Binance</option>
                  <option value="okx">OKX</option>
                  <option value="bybit">Bybit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">API key</label>
                <input
                  type="password"
                  value={form.api_key}
                  onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Secret key</label>
                <input
                  type="password"
                  value={form.secret_key}
                  onChange={(e) => setForm((f) => ({ ...f, secret_key: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Passphrase (optional)</label>
                <input
                  type="password"
                  value={form.passphrase}
                  onChange={(e) => setForm((f) => ({ ...f, passphrase: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="demo"
                  checked={form.demo}
                  onChange={(e) => setForm((f) => ({ ...f, demo: e.target.checked }))}
                  className="rounded border-border"
                />
                <label htmlFor="demo" className="text-sm text-text-muted">Demo / testnet</label>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium"
              >
                Add
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? (
        <p className="text-text-muted">Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={credentials}
          keyExtractor={(r) => r.id}
          emptyMessage="No credentials. Add one to trade."
        />
      )}
    </div>
  );
}
