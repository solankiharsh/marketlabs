'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, ChevronDown, ChevronRight, Info, ShoppingBag, Building2, Play, Pencil, Trash2, BarChart2, History, Lock } from 'lucide-react';
import { getIndicators, getIndicatorParams, executeIndicatorWithKline } from '@/lib/api';

const HIDDEN_IDS_KEY = 'indicator-analysis-hidden-ids';

function getHiddenIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(HIDDEN_IDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(Number).filter((n) => !Number.isNaN(n)) : []);
  } catch {
    return new Set();
  }
}

function addHiddenId(id: number): void {
  const set = getHiddenIds();
  set.add(id);
  try {
    localStorage.setItem(HIDDEN_IDS_KEY, JSON.stringify([...set]));
  } catch {}
}
import type { IndicatorItem, ExecuteIndicatorOutput, IndicatorParamDef } from '@/lib/api';
import { fetchOHLCV } from '@/lib/chart-data';
import { IndicatorParametersModal } from './IndicatorParametersModal';

/** Map UI timeframe to chart-data period (1D -> d, 1H -> 1h, etc.) */
const TIMEFRAME_TO_PERIOD: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1H': '1h',
  '4H': '4h',
  '1D': 'd',
  '1W': 'w',
};

interface TechnicalIndicatorsSidebarProps {
  market: string;
  symbol: string;
  timeframe: string;
  activeIndicatorId?: number | null;
  onExecuteIndicator?: (output: ExecuteIndicatorOutput, indicator?: IndicatorItem) => void;
  onStopIndicator?: () => void;
  onBacktestClick?: (indicator: IndicatorItem) => void;
  onOpenCreateIndicator?: () => void;
  refreshTrigger?: number;
}

export function TechnicalIndicatorsSidebar({
  market,
  symbol,
  timeframe,
  activeIndicatorId = null,
  onExecuteIndicator,
  onStopIndicator,
  onBacktestClick,
  onOpenCreateIndicator,
  refreshTrigger,
}: TechnicalIndicatorsSidebarProps) {
  const [indicators, setIndicators] = useState<IndicatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createdOpen, setCreatedOpen] = useState(true);
  const [purchasedOpen, setPurchasedOpen] = useState(true);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [paramsModalOpen, setParamsModalOpen] = useState(false);
  const [paramsModalIndicator, setParamsModalIndicator] = useState<IndicatorItem | null>(null);
  const [paramsModalDefs, setParamsModalDefs] = useState<IndicatorParamDef[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(() => getHiddenIds());

  const refreshIndicators = useCallback(() => {
    setLoading(true);
    getIndicators()
      .then(setIndicators)
      .catch(() => setIndicators([]))
      .finally(() => setLoading(false));
  }, []);

  const runIndicatorExecution = useCallback(
    async (ind: IndicatorItem, params: Record<string, number | string | boolean>) => {
      if (!onExecuteIndicator) return;
      const period = TIMEFRAME_TO_PERIOD[timeframe] ?? 'd';
      try {
        const klines = await fetchOHLCV(market, symbol, period, 300);
        const klineData = klines.map((c) => ({
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: (c as { volume?: number }).volume ?? 0,
        }));
        const { output } = await executeIndicatorWithKline(ind.id as number, klineData, params);
        onExecuteIndicator(output, ind);
      } catch {
        // ignore
      } finally {
        setExecutingId(null);
      }
    },
    [market, symbol, timeframe, onExecuteIndicator]
  );

  const handlePlay = useCallback(
    async (ind: IndicatorItem) => {
      if (!onExecuteIndicator) return;
      setExecutingId(ind.id as number);
      try {
        const paramDefs = await getIndicatorParams(ind.id as number);
        if (paramDefs.length > 0) {
          setParamsModalIndicator(ind);
          setParamsModalDefs(paramDefs);
          setParamsModalOpen(true);
          setExecutingId(null);
          return;
        }
        await runIndicatorExecution(ind, {});
      } catch {
        setExecutingId(null);
      }
    },
    [onExecuteIndicator, runIndicatorExecution]
  );

  const handleParamsConfirm = useCallback(
    (values: Record<string, number | string | boolean>) => {
      if (!paramsModalIndicator) return;
      setParamsModalOpen(false);
      setExecutingId(paramsModalIndicator.id as number);
      runIndicatorExecution(paramsModalIndicator, values);
      setParamsModalIndicator(null);
      setParamsModalDefs([]);
    },
    [paramsModalIndicator, runIndicatorExecution]
  );

  const handleRemoveFromPage = useCallback((id: number) => {
    if (!confirm('Remove from this page only? The indicator will stay in Indicator Market and in your account.')) return;
    addHiddenId(id);
    setHiddenIds(getHiddenIds());
  }, []);

  const created = indicators.filter((i) => (i.is_buy as number) === 0 && !hiddenIds.has(Number(i.id)));
  const purchased = indicators.filter((i) => (i.is_buy as number) === 1 && !hiddenIds.has(Number(i.id)));

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
                  {created.map((ind) => {
                    const isActive = activeIndicatorId === (ind.id as number);
                    return (
                      <li
                        key={ind.id}
                        className={`rounded border p-2 transition-all duration-200 ${
                          isActive ? 'border-accent-primary/50 bg-accent-primary/10' : 'border-border bg-bg-secondary/50'
                        }`}
                      >
                        <div className="font-medium text-sm text-text-primary truncate">{ind.name || 'Unnamed'}</div>
                        <div className="text-xs text-text-muted truncate">{ind.description || '—'}</div>
                        <div className="flex items-center gap-1 mt-2">
                          {isActive ? (
                            <button
                              type="button"
                              onClick={onStopIndicator}
                              className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              title="Stop indicator"
                            >
                              Stop
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePlay(ind)}
                              disabled={executingId === (ind.id as number)}
                              className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                              title="Start indicator on chart"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onBacktestClick && (
                            <button
                              type="button"
                              onClick={() => onBacktestClick(ind)}
                              className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                              title="Start indicator backtest"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onBacktestClick?.(ind)}
                            className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                            title="Backtest history"
                          >
                            <History className="w-3.5 h-3.5" />
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
                            onClick={() => handleRemoveFromPage(ind.id as number)}
                            className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-error"
                            title="Remove from this page (still in Indicator Market)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
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
                  {purchased.map((ind) => {
                    const isActive = activeIndicatorId === (ind.id as number);
                    return (
                      <li
                        key={ind.id}
                        className={`rounded border p-2 transition-all duration-200 ${
                          isActive ? 'border-accent-primary/50 bg-accent-primary/10' : 'border-accent-primary/20 bg-bg-secondary/50'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-accent-primary shrink-0" />
                          <span className="font-medium text-sm text-accent-primary truncate">{ind.name || 'Unnamed'}</span>
                        </div>
                        <div className="text-xs text-text-muted truncate mt-0.5">{ind.description || '—'}</div>
                        <div className="flex items-center gap-1 mt-2">
                          {isActive ? (
                            <button
                              type="button"
                              onClick={onStopIndicator}
                              className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              title="Stop indicator"
                            >
                              Stop
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePlay(ind)}
                              disabled={executingId === (ind.id as number)}
                              className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                              title="Start indicator on chart"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onBacktestClick && (
                            <button
                              type="button"
                              onClick={() => onBacktestClick(ind)}
                              className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                              title="Start indicator backtest"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onBacktestClick?.(ind)}
                            className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                            title="Backtest history"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>

      <IndicatorParametersModal
        open={paramsModalOpen}
        onClose={() => {
          setParamsModalOpen(false);
          setParamsModalIndicator(null);
          setParamsModalDefs([]);
        }}
        indicator={paramsModalIndicator}
        paramDefs={paramsModalDefs}
        onConfirm={handleParamsConfirm}
        loading={executingId !== null}
      />
    </div>
  );
}
