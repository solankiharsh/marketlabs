'use client';

import { useEffect, useState } from 'react';
import { Sparkles, History, Bot, ChevronDown, X, Check, Loader2 } from 'lucide-react';
import { getMarketTypes, analyzeSymbol, getAnalysisHistory, type AnalysisDetailedResult } from '@/lib/api';
import { AnalysisOutput } from './AnalysisOutput';
import { SelectSymbolModal } from './SelectSymbolModal';
import { TimeframeBar, type TimeframeValue } from '@/components/indicator-analysis/TimeframeBar';
import { toast } from 'sonner';

const ANALYSIS_STEPS = [
  'Fetching real-time data',
  'Calculating indicators',
  'AI deep analysis',
  'Generating report',
] as const;

interface SymbolAnalyzerProps {
  /** When user clicks a watchlist item, parent sets these to auto-fill */
  selectedMarket?: string;
  selectedSymbol?: string;
  /** Analysis candle timeframe (e.g. 1D, 4H). When provided with onTimeframeChange, shows timeframe selector. */
  timeframe?: TimeframeValue;
  /** Called when user changes analysis timeframe. */
  onTimeframeChange?: (tf: TimeframeValue) => void;
  /** When provided, Analyze button triggers this instead of running locally; parent drives progress. Options may include timeframe. */
  onAnalyzeRequest?: (market: string, symbol: string, options?: { timeframe?: string }) => void;
  /** When parent is running analysis (e.g. from radar click) */
  externalAnalyzing?: boolean;
  /** Result from parent-driven analysis */
  externalResult?: AnalysisDetailedResult | null;
  /** Progress 0–100 when parent is analyzing */
  externalProgress?: number;
  /** Current step index 0–3 when parent is analyzing */
  externalStepIndex?: number;
  /** Elapsed seconds when parent is analyzing */
  externalElapsedSec?: number;
  /** Label e.g. "Crypto:BTC/USDT" when parent is analyzing */
  symbolLabel?: string;
}

export function SymbolAnalyzer({
  selectedMarket,
  selectedSymbol,
  timeframe = '1D',
  onTimeframeChange,
  onAnalyzeRequest,
  externalAnalyzing = false,
  externalResult,
  externalProgress = 0,
  externalStepIndex = 0,
  externalElapsedSec = 0,
  symbolLabel,
}: SymbolAnalyzerProps) {
  const [marketTypes, setMarketTypes] = useState<{ value: string }[]>([]);
  const [market, setMarket] = useState('Crypto');
  const [symbol, setSymbol] = useState('');
  const [symbolName, setSymbolName] = useState('');
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisDetailedResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<{ analysis?: string; created_at?: string }[]>([]);

  const isAnalyzing = externalAnalyzing || analyzing;
  const displayResult = externalResult !== undefined ? externalResult : analysisResult;

  useEffect(() => {
    getMarketTypes().then((types) => setMarketTypes(types)).catch(() => setMarketTypes([]));
  }, []);

  useEffect(() => {
    if (selectedMarket) setMarket(selectedMarket);
    if (selectedSymbol) {
      setSymbol(selectedSymbol);
      setSymbolName(selectedSymbol);
    }
  }, [selectedMarket, selectedSymbol]);

  const handleSelectSymbol = (m: string, s: string, name?: string) => {
    setMarket(m);
    setSymbol(s);
    setSymbolName(name ?? s);
    setSelectModalOpen(false);
  };

  const loadHistory = () => {
    if (!market || !symbol) return;
    setShowHistory(true);
    getAnalysisHistory(market, symbol, 7, 10)
      .then((res) => setHistoryItems(res.items ?? []))
      .catch(() => setHistoryItems([]));
  };

  const handleAnalyze = async () => {
    if (!market || !symbol.trim()) {
      toast.error('Select a symbol first');
      return;
    }
    const tf = timeframe ?? '1D';
    if (onAnalyzeRequest) {
      onAnalyzeRequest(market, symbol.trim(), { timeframe: tf });
      return;
    }
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeSymbol(market, symbol.trim(), { timeframe: tf });
      setAnalysisResult(result as AnalysisDetailedResult);
      setShowHistory(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent-primary/50 min-h-[40px] w-full sm:w-auto sm:min-w-[240px]"
            aria-label={symbol ? `Change symbol (current: ${symbol})` : 'Select symbol to start analysis'}
          >
            {symbol ? (
              <>
                <span className="font-medium">{market}</span>
                <span className="text-text-muted">/</span>
                <span className="font-medium">{symbol}</span>
                {symbolName && symbolName !== symbol && (
                  <span className="text-text-muted truncate max-w-[120px]">{symbolName}</span>
                )}
                <ChevronDown className="w-4 h-4 ml-auto text-text-muted shrink-0" />
              </>
            ) : (
              <>
                <span className="text-text-muted">Select symbol to start analysis</span>
                <ChevronDown className="w-4 h-4 ml-auto text-text-muted shrink-0" />
              </>
            )}
          </button>
          {symbol && (
            <button
              type="button"
              onClick={() => {
                setSymbol('');
                setSymbolName('');
                setAnalysisResult(null);
                setShowHistory(false);
              }}
              className="p-2 rounded-lg border border-border bg-bg-secondary text-text-muted hover:bg-bg-elevated hover:text-text-primary"
              aria-label="Clear symbol"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {timeframe != null && onTimeframeChange && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-text-muted">Timeframe</span>
            <TimeframeBar value={timeframe} onChange={onTimeframeChange} dark />
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !symbol.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium hover:bg-accent-primary/30 disabled:opacity-50 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
          <button
            type="button"
            onClick={loadHistory}
            disabled={!symbol.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated text-text-primary disabled:opacity-50 text-sm"
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>
      </div>

      <SelectSymbolModal
        open={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        onSelect={handleSelectSymbol}
      />

      {marketTypes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {marketTypes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setMarket(t.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                market === t.value
                  ? 'bg-accent-primary/20 border-accent-primary/40 text-accent-primary'
                  : 'border-border bg-bg-secondary text-text-secondary hover:bg-bg-elevated'
              }`}
            >
              {t.value}
            </button>
          ))}
        </div>
      )}

      {isAnalyzing && !onAnalyzeRequest && (
        <div className="space-y-3 animate-pulse">
          <div className="h-24 rounded-lg bg-bg-elevated" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-bg-elevated" />
            ))}
          </div>
          <div className="h-32 rounded-lg bg-bg-elevated" />
          <p className="text-sm text-text-muted">Running AI analysis… this may take up to 30 seconds.</p>
        </div>
      )}

      {isAnalyzing && onAnalyzeRequest && (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-text-muted">
              <span>Progress</span>
              <span>{Math.round(externalProgress)}%</span>
            </div>
            <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
              <div
                className="h-full bg-accent-primary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, externalProgress))}%` }}
              />
            </div>
          </div>
          <ul className="space-y-2">
            {ANALYSIS_STEPS.map((label, i) => {
              const done = i < externalStepIndex;
              const active = i === externalStepIndex;
              return (
                <li
                  key={label}
                  className={`flex items-center gap-2 text-sm ${
                    done
                      ? 'text-green-600 dark:text-green-400'
                      : active
                        ? 'text-accent-primary font-medium'
                        : 'text-text-muted'
                  }`}
                >
                  {done ? (
                    <Check className="w-4 h-4 shrink-0 text-green-500" />
                  ) : active ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin text-accent-primary" />
                  ) : (
                    <span className="w-4 h-4 shrink-0 rounded-full bg-bg-elevated border border-border" />
                  )}
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-text-muted tabular-nums">{externalElapsedSec}s</p>
        </div>
      )}

      {!isAnalyzing && !displayResult && !showHistory && !symbol && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bot className="w-12 h-12 text-text-muted mb-3" />
          <p className="text-sm font-medium text-text-primary">Select a symbol to start AI analysis</p>
          <p className="text-xs text-text-muted mt-1">
            Choose from your watchlist or search for a symbol above.
          </p>
        </div>
      )}

      {!isAnalyzing && showHistory && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-primary">Recent analyses for {symbol}</p>
          <ul className="max-h-48 overflow-auto space-y-2">
            {historyItems.length === 0 && <li className="text-sm text-text-muted">No history yet.</li>}
            {historyItems.map((item, i) => (
              <li
                key={i}
                className="text-sm text-text-secondary border-b border-border/50 pb-2 last:border-0 line-clamp-2"
              >
                {item.analysis ?? '—'}
                {item.created_at && (
                  <span className="block text-xs text-text-muted mt-1">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isAnalyzing && displayResult && !displayResult.error && (
        <AnalysisOutput result={displayResult} />
      )}

      {!isAnalyzing && displayResult?.error && (
        <p className="text-sm text-red-400">{displayResult.error}</p>
      )}
    </div>
  );
}
