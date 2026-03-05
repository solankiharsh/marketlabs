'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { adminListUsers } from '@/lib/api';
import { DataTable, type Column } from '@/components/ui/DataTable';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, checked } = useAuthStore();
  const [users, setUsers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!checked) return;
    if (user?.role !== 'admin') {
      router.replace('/');
      return;
    }
    adminListUsers(1, 20, search || undefined)
      .then((r) => setUsers(r.items))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [checked, user?.role, router, search]);

  if (!checked || user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'id', header: 'ID' },
    { key: 'username', header: 'Username' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role' },
    { key: 'credits', header: 'Credits', render: (r) => (typeof r.credits === 'number' ? r.credits.toLocaleString() : String(r.credits ?? '—')) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Admin · Users</h1>
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full max-w-xs px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
        />
      </div>
      {loading ? (
        <p className="text-text-muted">Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={users as Record<string, unknown>[]}
          keyExtractor={(r) => String(r.id ?? Math.random())}
          emptyMessage="No users"
        />
      )}
    </div>
  );
}
