'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, ChevronDown, ChevronRight, Info, ShoppingBag, Building2, Play, Pencil, Trash2, BarChart2, History, Lock } from 'lucide-react';
import { getIndicators, executeIndicator, deleteIndicator } from '@/lib/api';
import type { IndicatorItem, ExecuteIndicatorOutput } from '@/lib/api';

interface TechnicalIndicatorsSidebarProps {
  market: string;
  symbol: string;
  timeframe: string;
  onExecuteIndicator?: (output: ExecuteIndicatorOutput) => void;
  onBacktestClick?: (indicator: IndicatorItem) => void;
  onOpenCreateIndicator?: () => void;
  refreshTrigger?: number;
}

export function TechnicalIndicatorsSidebar({
  market,
  symbol,
  timeframe,
  onExecuteIndicator,
  onBacktestClick,
  onOpenCreateIndicator,
  refreshTrigger,
}: TechnicalIndicatorsSidebarProps) {
  const [indicators, setIndicators] = useState<IndicatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createdOpen, setCreatedOpen] = useState(true);
  const [purchasedOpen, setPurchasedOpen] = useState(true);
  const [executingId, setExecutingId] = useState<number | null>(null);

  const refreshIndicators = useCallback(() => {
    setLoading(true);
    getIndicators()
      .then(setIndicators)
      .catch(() => setIndicators([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePlay = useCallback(
    async (ind: IndicatorItem) => {
      const code = ind.code as string | undefined;
      if (!code?.trim() || !onExecuteIndicator) return;
      setExecutingId(ind.id as number);
      try {
        const { output } = await executeIndicator(code, symbol, timeframe);
        onExecuteIndicator(output);
      } catch {
        // ignore
      } finally {
        setExecutingId(null);
      }
    },
    [symbol, timeframe, onExecuteIndicator]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('Delete this indicator?')) return;
      try {
        await deleteIndicator(id);
        refreshIndicators();
      } catch {}
    },
    [refreshIndicators]
  );

  const created = indicators.filter((i) => (i.is_buy as number) === 0);
  const purchased = indicators.filter((i) => (i.is_buy as number) === 1);

  useEffect(() => {
    refreshIndicators();
  }, [refreshIndicators, refreshTrigger]);

  return (
    <div className="w-[300px] shrink-0 rounded-lg border border-border bg-card flex flex-col overflow-hidden transition-all duration-300">
      {/* Technical Indicators title + refresh */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary">Technical Indicators</h2>
        <button
          type="button"
          onClick={refreshIndicators}
          className="p-1.5 rounded-full text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
          title="Refresh"
          aria-label="Refresh indicators"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* My Created Indicators - collapsible */}
        <section className="transition-all duration-300 ease-in-out">
          <button
            type="button"
            onClick={() => setCreatedOpen((o) => !o)}
            className="flex items-center gap-2 w-full text-left py-1.5 rounded hover:bg-bg-elevated/50 transition-colors"
          >
            {createdOpen ? (
              <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
            )}
            <span className="text-sm font-medium text-text-secondary">My Created Indicators ({created.length})</span>
          </button>
          <div
            className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
            style={{ maxHeight: createdOpen ? 500 : 0 }}
          >
            <div className="pt-2 space-y-2">
              {onOpenCreateIndicator ? (
                <button
                  type="button"
                  onClick={onOpenCreateIndicator}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-accent-primary/40 bg-accent-primary/10 text-accent-primary text-sm font-medium hover:bg-accent-primary/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create indicator
                </button>
              ) : (
                <Link
                  href="/indicators/editor"
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-accent-primary/40 bg-accent-primary/10 text-accent-primary text-sm font-medium hover:bg-accent-primary/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create indicator
                </Link>
              )}
              {loading ? (
                <p className="text-xs text-text-muted py-2">Loading...</p>
              ) : created.length === 0 ? (
                <div className="flex items-center gap-2 py-3 text-text-muted">
                  <Info className="w-4 h-4 shrink-0" />
                  <span className="text-xs">No indicators, please add or create indicators first.</span>
                </div>
              ) : (
                <ul className="space-y-2">
                  {created.map((ind) => (
                    <li
                      key={ind.id}
                      className="rounded border border-border bg-bg-secondary/50 p-2 transition-all duration-200"
                    >
                      <div className="font-medium text-sm text-text-primary truncate">{ind.name || 'Unnamed'}</div>
                      <div className="text-xs text-text-muted truncate">{ind.description || '—'}</div>
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          type="button"
                          onClick={() => handlePlay(ind)}
                          disabled={executingId === (ind.id as number)}
                          className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                          title="Run on chart"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/indicators/editor?id=${ind.id}`}
                          className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(ind.id as number)}
                          className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-error"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Purchased Indicators - collapsible */}
        <section className="transition-all duration-300 ease-in-out">
          <button
            type="button"
            onClick={() => setPurchasedOpen((o) => !o)}
            className="flex items-center gap-2 w-full text-left py-1.5 rounded hover:bg-bg-elevated/50 transition-colors"
          >
            {purchasedOpen ? (
              <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
            )}
            <span className="text-sm font-medium text-text-secondary">Purchased Indicators ({purchased.length})</span>
          </button>
          <div
            className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
            style={{ maxHeight: purchasedOpen ? 500 : 0 }}
          >
            <div className="pt-2 space-y-2">
              <Link
                href="/indicator-market"
                className="flex items-center gap-2 text-sm text-accent-primary hover:underline"
              >
                <Building2 className="w-4 h-4 shrink-0" />
                Indicator Market
              </Link>
              {!loading && purchased.length === 0 && (
                <div className="flex items-center gap-2 py-3 text-text-muted">
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span className="text-xs">No purchased indicators, check out the market.</span>
                </div>
              )}
              {purchased.length > 0 && (
                <ul className="space-y-2">
                  {purchased.map((ind) => (
                    <li
                      key={ind.id}
                      className="rounded border border-accent-primary/20 bg-bg-secondary/50 p-2 transition-all duration-200"
                    >
                      <div className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-accent-primary shrink-0" />
                        <span className="font-medium text-sm text-accent-primary truncate">{ind.name || 'Unnamed'}</span>
                      </div>
                      <div className="text-xs text-text-muted truncate mt-0.5">{ind.description || '—'}</div>
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          type="button"
                          onClick={() => handlePlay(ind)}
                          disabled={executingId === (ind.id as number)}
                          className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                          title="Run on chart"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        {onBacktestClick && (
                          <button
                            type="button"
                            onClick={() => onBacktestClick(ind)}
                            className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                            title="Indicator Backtest"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                          title="History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
