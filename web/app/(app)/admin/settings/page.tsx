'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { getSettingsSchema, getSettingsValues, saveSettings } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, checked } = useAuthStore();
  const [schema, setSchema] = useState<Record<string, unknown>>({});
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!checked) return;
    if (user?.role !== 'admin') {
      router.replace('/');
      return;
    }
    Promise.all([
      getSettingsSchema().then(setSchema).catch(() => ({})),
      getSettingsValues().then(setValues).catch(() => ({})),
    ]).finally(() => setLoading(false));
  }, [checked, user?.role, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(values);
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!checked || user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Admin · Settings</h1>
      {loading ? (
        <p className="text-text-muted">Loading...</p>
      ) : (
        <form onSubmit={handleSave} className="rounded-lg border border-border bg-card p-6 space-y-4">
          <p className="text-sm text-text-muted">
            Schema: {Object.keys(schema).length} keys. Edit values and save.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium text-sm"
          >
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </form>
      )}
    </div>
  );
}
