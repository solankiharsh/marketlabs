'use client';

import { useState, useEffect } from 'react';
import { Save, Send } from 'lucide-react';
import { getNotifications, updateNotifications } from '@/lib/api/profile-membership';
import type { NotificationSettings } from '@/lib/api/profile-membership';
import { toast } from 'sonner';

const CHANNELS = [
  { key: 'in_app', label: 'In-App Notification' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'discord', label: 'Discord' },
  { key: 'webhook', label: 'Webhook' },
] as const;

export function TabNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotifications()
      .then(setSettings)
      .catch(() => setSettings({ channels: {}, default_channels: ['browser'] }))
      .finally(() => setLoading(false));
  }, []);

  const updateChannel = (key: string, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, channels: { ...prev?.channels } };
      next.channels = next.channels ?? {};
      next.channels[key] = value;
      return next;
    });
  };

  const updateField = (field: keyof NotificationSettings, value: string | undefined) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateNotifications(settings);
      toast.success('Notification settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <p className="text-[var(--text-muted)]">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--text-secondary)]">
        Configure your default notification methods, which will be used automatically when creating asset monitors and alerts.
      </p>
      <div>
        <p className="mb-2 text-sm font-medium text-[var(--text-muted)]">Default Notification Channels</p>
        <div className="flex flex-wrap gap-4">
          {CHANNELS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.channels?.[key] ?? (key === 'in_app')}
                onChange={(e) => updateChannel(key, e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-input)] text-[var(--cta-primary)] focus:ring-[var(--gold)]/20"
              />
              <span className="text-sm text-[var(--text-primary)]">{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text-muted)]">Telegram Chat ID</label>
        <input
          type="text"
          value={settings.telegram_chat_id ?? ''}
          onChange={(e) => updateField('telegram_chat_id', e.target.value)}
          placeholder="e.g. 123456789"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
        />
        <p className="mt-1 text-xs text-[var(--text-muted)]">Send /start to @userinfobot to get your Chat ID</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text-muted)]">Notification Email</label>
        <input
          type="email"
          value={settings.notification_email ?? ''}
          onChange={(e) => updateField('notification_email', e.target.value)}
          placeholder="Override account email"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text-muted)]">Discord Webhook</label>
        <input
          type="url"
          value={settings.discord_webhook ?? ''}
          onChange={(e) => updateField('discord_webhook', e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--cta-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--cta-hover)] disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Save
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
        >
          <Send className="h-4 w-4" />
          Send Test Notification
        </button>
      </div>
    </div>
  );
}
