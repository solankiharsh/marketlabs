'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog';
import { createMonitor } from '@/lib/api';
import type { PortfolioPosition } from '@/lib/api/portfolio-types';
import { toast } from 'sonner';

const INTERVAL_OPTIONS = [
  { label: '1 hour', minutes: 60 },
  { label: '4 hours', minutes: 240 },
  { label: '12 hours', minutes: 720 },
  { label: '1 day', minutes: 1440 },
  { label: '1 week', minutes: 10080 },
];

interface AddMonitorModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  positions: PortfolioPosition[];
}

export function AddMonitorModal({ open, onClose, onSuccess, positions }: AddMonitorModalProps) {
  const [name, setName] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [notifyTelegram, setNotifyTelegram] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [selectedPositionIds, setSelectedPositionIds] = useState<number[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName('');
    setIntervalMinutes(60);
    setNotifyBrowser(true);
    setNotifyTelegram(false);
    setNotifyEmail(false);
    setScope('all');
    setSelectedPositionIds([]);
    setCustomPrompt('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const togglePosition = (id: number) => {
    setSelectedPositionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a monitor name');
      return;
    }
    const positionIds = scope === 'all' ? [] : selectedPositionIds;
    if (scope === 'selected' && positionIds.length === 0) {
      toast.error('Please select at least one position');
      return;
    }
    setSubmitting(true);
    try {
      await createMonitor({
        name: name.trim(),
        position_ids: scope === 'all' ? undefined : positionIds,
        monitor_type: 'ai',
        config: {
          interval_minutes: intervalMinutes,
          ...(customPrompt.trim() ? { custom_prompt: customPrompt.trim() } : {}),
        },
        notification_config: {
          browser: notifyBrowser,
          telegram: notifyTelegram,
          email: notifyEmail,
        },
        is_active: true,
      });
      toast.success('Monitor created');
      handleClose();
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create monitor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle>Add Monitor</DialogTitle>
          <DialogClose asChild>
            <button type="button" className="rounded-lg p-1 text-text-muted hover:text-text-primary" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Monitor Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Daily Portfolio Analysis"
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-text-primary placeholder:text-text-muted"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Interval *</label>
            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-text-primary"
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.minutes} value={opt.minutes}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Notify Channels</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyBrowser}
                  onChange={(e) => setNotifyBrowser(e.target.checked)}
                  className="rounded border-border text-accent-primary focus:ring-accent-primary/50"
                />
                <span className="text-sm text-text-primary">Browser</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyTelegram}
                  onChange={(e) => setNotifyTelegram(e.target.checked)}
                  className="rounded border-border text-accent-primary focus:ring-accent-primary/50"
                />
                <span className="text-sm text-text-primary">Telegram</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="rounded border-border text-accent-primary focus:ring-accent-primary/50"
                />
                <span className="text-sm text-text-primary">Email</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Monitor Scope *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="border-border text-accent-primary focus:ring-accent-primary/50"
                />
                <span className="text-sm text-text-primary">All Positions</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'selected'}
                  onChange={() => setScope('selected')}
                  className="border-border text-accent-primary focus:ring-accent-primary/50"
                />
                <span className="text-sm text-text-primary">Selected Positions</span>
              </label>
            </div>
            {scope === 'selected' && positions.length > 0 && (
              <div className="mt-3 rounded-lg border border-border bg-bg-secondary max-h-40 overflow-auto p-2">
                {positions.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPositionIds.includes(p.id)}
                      onChange={() => togglePosition(p.id)}
                      className="rounded border-border text-accent-primary focus:ring-accent-primary/50"
                    />
                    <span className="text-sm text-text-primary">{p.symbol} ({p.market})</span>
                  </label>
                ))}
              </div>
            )}
            {scope === 'selected' && positions.length === 0 && (
              <p className="mt-2 text-xs text-text-muted">Add positions first to select them.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Custom Prompt</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder='Optional: e.g. "Focus on tech stock risks"'
              rows={2}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-text-primary placeholder:text-text-muted resize-y"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-accent-primary/20 border border-accent-primary/40 px-4 py-2 text-sm font-medium text-accent-primary hover:bg-accent-primary/30 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'OK'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
