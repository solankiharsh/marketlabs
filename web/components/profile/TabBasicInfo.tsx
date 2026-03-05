'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import type { UserProfile } from '@/lib/api/profile-membership';
import { updateProfileData } from '@/lib/api/profile-membership';
import { toast } from 'sonner';

interface TabBasicInfoProps {
  profile: UserProfile | null;
  onUpdated: () => void;
}

export function TabBasicInfo({ profile, onUpdated }: TabBasicInfoProps) {
  const [nickname, setNickname] = useState(profile?.nickname ?? profile?.username ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfileData({ nickname: nickname.trim() || undefined });
      toast.success('Profile updated');
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text-muted)]">Nickname</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Your display name"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text-muted)]">Email</label>
        <input
          type="text"
          readOnly
          value={profile?.email ?? ''}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-secondary)]"
        />
        <p className="mt-1 text-xs text-[var(--text-muted)]">Read-only. Contact support to change email.</p>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--cta-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--cta-hover)] disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        Save
      </button>
    </form>
  );
}
