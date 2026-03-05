'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { adminGetOrders } from '@/lib/api';
import { DataTable, type Column } from '@/components/ui/DataTable';

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, checked } = useAuthStore();
  const [orders, setOrders] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checked) return;
    if (user?.role !== 'admin') {
      router.replace('/');
      return;
    }
    adminGetOrders()
      .then((r) => setOrders(r.items))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [checked, user?.role, router]);

  if (!checked || user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'id', header: 'ID' },
    { key: 'user_id', header: 'User ID' },
    { key: 'symbol', header: 'Symbol' },
    { key: 'side', header: 'Side' },
    { key: 'status', header: 'Status' },
    { key: 'created_at', header: 'Created', render: (r) => (r.created_at ? new Date(String(r.created_at)).toLocaleString() : '—') },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Admin · Orders</h1>
      {loading ? (
        <p className="text-text-muted">Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={orders as Record<string, unknown>[]}
          keyExtractor={(r) => String(r.id ?? Math.random())}
          emptyMessage="No orders"
        />
      )}
    </div>
  );
}
