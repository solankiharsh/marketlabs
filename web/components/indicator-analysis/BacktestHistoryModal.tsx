'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, FileText, Bot } from 'lucide-react';
import { getBacktestHistory, aiAnalyzeBacktest } from '@/lib/api';
import type { IndicatorItem } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

interface BacktestHistoryModalProps {
  open: boolean;
  onClose: () => void;
  indicator: IndicatorItem | null;
  symbol?: string;
  timeframe?: string;
}

export function BacktestHistoryModal({
  open,
  onClose,
  indicator,
  symbol,
  timeframe,
}: BacktestHistoryModalProps) {
  const [onlyCurrent, setOnlyCurrent] = useState(true);
  const [items, setItems] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBacktestHistory({ page: 1, pageSize: 50 });
      setItems(res.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchHistory();
  }, [open, fetchHistory]);

  const handleAiAnalyze = async () => {
    if (items.length === 0) return;
    setAnalyzing(true);
    try {
      const runIds = (items as { runId?: string }[]).map((i) => i.runId ?? '').filter(Boolean);
      const res = await aiAnalyzeBacktest(runIds);
      setAnalysis(res.analysis ?? null);
    } catch {
      setAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Backtest History</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded p-1 hover:bg-bg-elevated text-text-muted"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2 border-b border-border">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={onlyCurrent}
              onChange={(e) => setOnlyCurrent(e.target.checked)}
              className="rounded border-border"
            />
            Only current symbol/timeframe
          </label>
          <button
            type="button"
            onClick={fetchHistory}
            className="px-3 py-1.5 rounded-lg border border-accent-primary/40 text-accent-primary text-sm font-medium"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleAiAnalyze}
            disabled={items.length === 0 || analyzing}
            className="px-3 py-1.5 rounded-lg border border-border text-text-secondary text-sm disabled:opacity-50"
          >
            {analyzing ? 'Analyzing...' : 'AI Analyze'}
          </button>
        </div>

        <div className="flex-1 overflow-auto border border-border rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg-elevated sticky top-0">
              <tr>
                <th className="px-3 py-2 font-medium text-text-secondary">Run ID</th>
                <th className="px-3 py-2 font-medium text-text-secondary">Time</th>
                <th className="px-3 py-2 font-medium text-text-secondary">Direction</th>
                <th className="px-3 py-2 font-medium text-text-secondary">Leverage</th>
                <th className="px-3 py-2 font-medium text-text-secondary">Range</th>
                <th className="px-3 py-2 font-medium text-text-secondary">Status</th>
                <th className="px-3 py-2 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-text-muted">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No Data</p>
                  </td>
                </tr>
              )}
              {(items as Record<string, unknown>[]).map((row, idx) => (
                <tr key={idx} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-text-primary">{String(row.runId ?? row.id ?? '—')}</td>
                  <td className="px-3 py-2 text-text-secondary">{String(row.time ?? '—')}</td>
                  <td className="px-3 py-2 text-text-secondary">{String(row.tradeDirection ?? '—')}</td>
                  <td className="px-3 py-2 text-text-secondary">{String(row.leverage ?? '—')}</td>
                  <td className="px-3 py-2 text-text-secondary">{String(row.range ?? '—')}</td>
                  <td className="px-3 py-2 text-text-secondary">{String(row.status ?? '—')}</td>
                  <td className="px-3 py-2 text-text-muted">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && !loading && (
          <p className="text-center text-text-muted text-sm py-4 flex items-center justify-center gap-2">
            <Bot className="w-4 h-4" />
            No backtest history
          </p>
        )}

        {analysis && (
          <div className="mt-4 p-4 rounded-lg border border-border bg-bg-secondary text-sm text-text-secondary whitespace-pre-wrap">
            {analysis}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
