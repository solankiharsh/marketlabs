'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { getIndicators, deleteIndicator } from '@/lib/api';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { toast } from 'sonner';

export default function IndicatorsPage() {
  const [indicators, setIndicators] = useState<{ id: number; name?: string; description?: string; createtime?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getIndicators()
      .then(setIndicators)
      .catch(() => setIndicators([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this indicator?')) return;
    try {
      await deleteIndicator(id);
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const columns: Column<{ id: number; name?: string; description?: string; createtime?: string }>[] = [
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description', render: (r) => (r.description ? String(r.description).slice(0, 60) + (String(r.description).length > 60 ? '...' : '') : '—') },
    { key: 'createtime', header: 'Created', render: (r) => (r.createtime ? new Date(String(r.createtime)).toLocaleDateString() : '—') },
    {
      key: 'id',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Link href={`/indicators/editor?id=${r.id}`} className="text-accent-primary hover:underline text-sm">
            Edit
          </Link>
          <button
            type="button"
            onClick={() => handleDelete(r.id)}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Indicators</h1>
        <Link
          href="/indicators/editor"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium hover:bg-accent-primary/30 text-sm"
        >
          <Plus className="h-4 w-4" />
          Create New
        </Link>
      </div>
      {loading ? (
        <p className="text-text-muted">Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={indicators}
          keyExtractor={(r) => r.id}
          emptyMessage="No indicators. Create one to get started."
        />
      )}
    </div>
  );
}
