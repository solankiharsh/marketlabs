'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { adminGetAiStats } from '@/lib/api';

export default function AdminStatsPage() {
  const router = useRouter();
  const { user, checked } = useAuthStore();
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checked) return;
    if (user?.role !== 'admin') {
      router.replace('/');
      return;
    }
    adminGetAiStats()
      .then(setStats)
      .catch(() => setStats({}))
      .finally(() => setLoading(false));
  }, [checked, user?.role, router]);

  if (!checked || user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Admin · AI Stats</h1>
      {loading ? (
        <p className="text-text-muted">Loading...</p>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          <pre className="text-sm text-text-secondary overflow-auto max-h-96">
            {JSON.stringify(stats, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
