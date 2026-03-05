'use client';

import { useEffect, useState } from 'react';
import {
  getProfile,
  updateProfile,
  getNotificationSettings,
  updateNotificationSettings,
  changePassword,
  getMyCreditsLog,
  getMyReferrals,
} from '@/lib/api';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { toast } from 'sonner';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [notifications, setNotifications] = useState<Record<string, unknown>>({});
  const [creditsLog, setCreditsLog] = useState<unknown[]>([]);
  const [referrals, setReferrals] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      getProfile().then((p) => {
        setProfile(p);
        setNickname(String(p.nickname ?? p.username ?? ''));
      }),
      getNotificationSettings().then(setNotifications).catch(() => ({})),
      getMyCreditsLog(1, 20).then((r) => setCreditsLog(r.items)).catch(() => []),
      getMyReferrals(1, 20).then((r) => setReferrals(r.items)).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await updateProfile({ nickname: nickname.trim() || undefined });
      toast.success('Profile updated');
      getProfile().then(setProfile);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.error('Enter current and new password');
      return;
    }
    setSaveLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast.success('Password changed');
      setOldPassword('');
      setNewPassword('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Change password failed');
    } finally {
      setSaveLoading(false);
    }
  };

  const creditsColumns: Column<Record<string, unknown>>[] = [
    { key: 'amount', header: 'Amount', render: (r) => (typeof r.amount === 'number' ? r.amount.toLocaleString() : String(r.amount ?? '—')) },
    { key: 'remark', header: 'Remark' },
    { key: 'created_at', header: 'Date', render: (r) => (r.created_at ? new Date(String(r.created_at)).toLocaleString() : '—') },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-text-muted">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-display font-bold">Profile</h1>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Profile info</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Username</label>
            <p className="text-text-primary">{String(profile.username ?? '—')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            />
          </div>
          <button
            type="submit"
            disabled={saveLoading}
            className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium text-sm"
          >
            Save
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Current password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            />
          </div>
          <button
            type="submit"
            disabled={saveLoading}
            className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated text-sm"
          >
            Change password
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Credits log</h2>
        <DataTable
          columns={creditsColumns}
          data={creditsLog as Record<string, unknown>[]}
          keyExtractor={(r) => String(r.id ?? Math.random())}
          emptyMessage="No credits log"
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Referrals</h2>
        <p className="text-sm text-text-muted">
          {referrals.length === 0 ? 'No referrals yet.' : `Total: ${referrals.length}`}
        </p>
      </div>
    </div>
  );
}
