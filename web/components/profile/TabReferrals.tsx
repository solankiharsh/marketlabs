'use client';

import { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { getReferralsData } from '@/lib/api/profile-membership';
import type { ReferralData } from '@/lib/api/profile-membership';

export function TabReferrals() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReferralsData()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const copyLink = () => {
    if (data?.referral_link) {
      navigator.clipboard.writeText(data.referral_link);
    }
  };

  if (loading) return <p className="text-[var(--text-muted)]">Loading...</p>;
  if (!data) return <p className="text-[var(--text-muted)]">Failed to load referrals.</p>;

  const referrals = data.referrals ?? [];

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">User</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Registered</th>
            </tr>
          </thead>
          <tbody>
            {referrals.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  <p className="font-medium">No referrals yet</p>
                  <p className="mt-1 text-sm">Share your link to invite friends.</p>
                </td>
              </tr>
            ) : (
              referrals.map((r, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 text-[var(--text-primary)]">{r.user ?? r.email ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{r.registered}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--cta-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--cta-hover)]"
      >
        <Share2 className="h-4 w-4" />
        Share Now
      </button>
    </div>
  );
}
