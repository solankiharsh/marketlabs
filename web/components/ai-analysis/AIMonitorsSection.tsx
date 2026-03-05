'use client';

import { Eye, FileText, Play, Pencil, Trash2, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { PortfolioMonitor } from '@/lib/api/portfolio-types';
import { runMonitor, updateMonitor, deleteMonitor } from '@/lib/api';
import { toast } from 'sonner';

interface AIMonitorsSectionProps {
  monitors: PortfolioMonitor[];
  onAddClick: () => void;
  onEdit?: (monitor: PortfolioMonitor) => void;
  onRefresh: () => void;
}

function formatInterval(minutes?: number): string {
  if (minutes == null) return '—';
  if (minutes < 60) return minutes + 'm';
  if (minutes < 1440) return Math.round(minutes / 60) + 'h';
  return Math.round(minutes / 1440) + 'd';
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    if (diffM < 1) return 'Just now';
    if (diffM < 60) return diffM + 'm ago';
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return diffH + 'h ago';
    return Math.floor(diffH / 24) + 'd ago';
  } catch {
    return '—';
  }
}

export function AIMonitorsSection({ monitors, onAddClick, onEdit, onRefresh }: AIMonitorsSectionProps) {
  const handleRun = async (id: number) => {
    try {
      await runMonitor(id);
      toast.success('Monitor run started');
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Run failed');
    }
  };

  const handleToggleActive = async (m: PortfolioMonitor) => {
    try {
      await updateMonitor(m.id, { is_active: !m.is_active });
      toast.success(m.is_active ? 'Monitor paused' : 'Monitor active');
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this monitor?')) return;
    try {
      await deleteMonitor(id);
      toast.success('Monitor deleted');
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-text-muted" />
          <h2 className="text-lg font-semibold text-text-primary">AI Monitors</h2>
        </div>
        <button
          type="button"
          onClick={onAddClick}
          className="rounded-lg bg-accent-primary/20 border border-accent-primary/40 px-3 py-2 text-sm font-medium text-accent-primary hover:bg-accent-primary/30 transition-all"
        >
          + Add Monitor
        </button>
      </div>

      {monitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="h-10 w-10 text-text-muted mb-2" />
          <p className="text-text-primary font-medium">No monitors yet</p>
          <button
            type="button"
            onClick={onAddClick}
            className="mt-2 rounded-lg border border-accent-primary/40 px-3 py-2 text-sm font-medium text-accent-primary hover:bg-accent-primary/10"
          >
            + Add AI Monitor
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {monitors.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-border bg-bg-secondary p-3 transition-all duration-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary truncate">{m.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-text-muted">
                    <span>Every {formatInterval(m.config?.interval_minutes)}</span>
                    <span>·</span>
                    <span>Last run: {formatTime(m.last_run_at)}</span>
                    <Badge variant={m.is_active ? 'success' : 'muted'} className="ml-1">
                      {m.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  {m.position_ids?.length != null && m.position_ids.length > 0 && (
                    <p className="text-xs text-text-muted mt-0.5">
                      Scope: {m.position_ids.length} position{m.position_ids.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRun(m.id)}
                    className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                    title="Run now"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(m)}
                      className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(m)}
                    className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                    title={m.is_active ? 'Pause' : 'Resume'}
                  >
                    <Pause className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
