'use client';

import { useState } from 'react';
import { Lightbulb, AlertTriangle, BarChart3 } from 'lucide-react';
import { submitAnalysisFeedback, type AnalysisDetailedResult } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';

function ConfidenceRing({ value }: { value: number }) {
  const size = 56;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-accent-primary transition-all duration-500"
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums text-text-primary">{value}%</span>
    </div>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const clamped = Math.min(100, Math.max(0, score));
  const barColor =
    clamped >= 60 ? 'bg-green-500' : clamped >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className="font-mono tabular-nums text-text-primary">{score}</span>
      </div>
      <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

interface AnalysisOutputProps {
  result: AnalysisDetailedResult;
  onFeedbackSent?: () => void;
}

export function AnalysisOutput({ result, onFeedbackSent }: AnalysisOutputProps) {
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Coerce to HOLD when summary contains conflicting advice (e.g. 建议BUY + 建议观望)
  const rawDecision = (result.decision ?? 'HOLD') as 'BUY' | 'SELL' | 'HOLD';
  const summary = result.summary ?? '';
  const hasConflictingAdvice =
    (summary.includes('建议BUY') || summary.includes('建议SELL')) &&
    (summary.includes('建议观望') || summary.includes('观望'));
  const decision: 'BUY' | 'SELL' | 'HOLD' = hasConflictingAdvice ? 'HOLD' : rawDecision;
  const confidence = typeof result.confidence === 'number' ? result.confidence : 50;
  const detailed = result.detailed_analysis ?? { technical: '', fundamental: '', sentiment: '' };
  const plan = result.trading_plan ?? {
    entry_price: 0,
    stop_loss: 0,
    take_profit: 0,
    position_size_pct: 10,
    timeframe: 'medium',
  };
  // Avoid showing placeholder error text when backend forced HOLD due to conflict
  const rawReasons = result.reasons ?? [];
  const rawRisks = result.risks ?? [];
  const isPlaceholderReasons = rawReasons.length === 1 && (rawReasons[0] === 'Unable to analyze' || String(rawReasons[0]).includes('Unable to analyze'));
  const isPlaceholderRisks = rawRisks.length === 1 && (rawRisks[0] === 'Analysis error' || String(rawRisks[0]).includes('Analysis error'));
  const reasons = hasConflictingAdvice && isPlaceholderReasons ? ['Signals conflict (e.g. score vs RSI). HOLD recommended until clearer setup.'] : rawReasons;
  const risks = hasConflictingAdvice && isPlaceholderRisks ? ['Mixed technical signals; wait for clearer entry.'] : rawRisks;
  const scores = result.scores ?? {
    technical: 50,
    fundamental: 50,
    sentiment: 50,
    overall: 50,
  };
  const marketData = result.market_data ?? { current_price: 0, change_24h: 0, support: 0, resistance: 0 };
  const indicators = (result.indicators ?? {}) as Record<string, unknown>;
  const analysisTimeMs = result.analysis_time_ms ?? 0;
  const memoryId = result.memory_id;

  const isSell = decision === 'SELL';
  const isBuy = decision === 'BUY';

  const handleFeedback = async (feedback: 'helpful' | 'not_helpful') => {
    if (feedbackSent || !memoryId) return;
    try {
      await submitAnalysisFeedback(memoryId, feedback);
      setFeedbackSent(true);
      onFeedbackSent?.();
      toast.success('Thanks for your feedback');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit feedback');
    }
  };

  const rsi = (indicators.rsi as Record<string, unknown>) ?? {};
  const macd = (indicators.macd as Record<string, unknown>) ?? {};
  const movingAverages = (indicators.moving_averages as Record<string, unknown>) ?? {};
  const levels = (indicators.levels as Record<string, unknown>) ?? {};
  const volatility = (indicators.volatility as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-4">
      {/* Signal header card */}
      <div
        className={`rounded-xl border-l-4 p-4 ${
          isSell ? 'border-red-500' : isBuy ? 'border-green-500' : 'border-amber-500'
        } border-border bg-card`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className={`text-2xl font-bold ${
                isSell ? 'text-red-400' : isBuy ? 'text-green-400' : 'text-amber-400'
              }`}
            >
              {isSell ? '↓ SELL' : isBuy ? '↑ BUY' : 'HOLD'}
            </div>
            <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">{summary}</p>
          </div>
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <ConfidenceRing value={confidence} />
            <span className="text-[10px] text-text-muted uppercase">Confidence</span>
          </div>
        </div>
      </div>

      {/* Price levels row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 border-t-2 border-t-green-500">
          <p className="text-xs text-text-muted">Current Price</p>
          <p className="font-mono font-semibold text-text-primary tabular-nums">
            ${Number(marketData.current_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </p>
          <p className={`text-xs font-medium ${(marketData.change_24h as number) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(marketData.change_24h as number) >= 0 ? '+' : ''}
            {(marketData.change_24h as number)?.toFixed(2)}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 border-t-2 border-t-accent-primary">
          <p className="text-xs text-text-muted">Entry Price</p>
          <p className="font-mono font-semibold text-text-primary tabular-nums">
            ${Number(plan.entry_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 border-t-2 border-t-red-500">
          <p className="text-xs text-text-muted">Stop Loss</p>
          <p className="font-mono font-semibold text-red-400 tabular-nums">
            ${Number(plan.stop_loss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </p>
          <p className="text-[10px] text-text-muted">ATR-based</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 border-t-2 border-t-green-500">
          <p className="text-xs text-text-muted">Take Profit</p>
          <p className="font-mono font-semibold text-green-400 tabular-nums">
            ${Number(plan.take_profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </p>
          <p className="text-[10px] text-text-muted">ATR-based</p>
        </div>
      </div>

      {/* Score cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreBar score={scores.technical} label="Technical" />
        <ScoreBar score={scores.fundamental} label="Fundamental" />
        <ScoreBar score={scores.sentiment} label="Sentiment" />
        <ScoreBar score={scores.overall} label="Overall" />
      </div>

      {/* Detailed analysis sections */}
      {detailed.technical && (
        <div className="rounded-lg border border-border bg-card overflow-hidden border-l-4 border-l-teal-500">
          <div className="p-3 flex items-center gap-2 border-b border-border">
            <span className="text-sm font-semibold text-text-primary">Technical Analysis</span>
            <Badge variant="muted" className="text-[10px]">{scores.technical}分</Badge>
          </div>
          <p className="p-3 text-sm text-text-secondary whitespace-pre-wrap">{detailed.technical}</p>
        </div>
      )}
      {detailed.fundamental && (
        <div className="rounded-lg border border-border bg-card overflow-hidden border-l-4 border-l-blue-500">
          <div className="p-3 flex items-center gap-2 border-b border-border">
            <span className="text-sm font-semibold text-text-primary">Fundamental Analysis</span>
            <Badge variant="muted" className="text-[10px]">{scores.fundamental}分</Badge>
          </div>
          <p className="p-3 text-sm text-text-secondary whitespace-pre-wrap">{detailed.fundamental}</p>
        </div>
      )}
      {detailed.sentiment && (
        <div className="rounded-lg border border-border bg-card overflow-hidden border-l-4 border-l-pink-500">
          <div className="p-3 flex items-center gap-2 border-b border-border">
            <span className="text-sm font-semibold text-text-primary">Market Sentiment</span>
            <Badge variant="muted" className="text-[10px]">{scores.sentiment}分</Badge>
          </div>
          <p className="p-3 text-sm text-text-secondary whitespace-pre-wrap">{detailed.sentiment}</p>
        </div>
      )}

      {/* Key Reasons & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card overflow-hidden border-l-4 border-l-green-500">
          <div className="p-3 flex items-center gap-2 border-b border-border">
            <Lightbulb className="w-4 h-4 text-accent-primary" />
            <span className="text-sm font-semibold text-text-primary">Key Reasons</span>
          </div>
          <ul className="p-3 list-disc list-inside text-sm text-text-secondary space-y-1">
            {reasons.length > 0 ? reasons.map((r, i) => <li key={i}>{r}</li>) : <li>—</li>}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card overflow-hidden border-l-4 border-l-amber-500">
          <div className="p-3 flex items-center gap-2 border-b border-border">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-text-primary">Risks</span>
          </div>
          <ul className="p-3 list-disc list-inside text-sm text-text-secondary space-y-1">
            {risks.length > 0 ? risks.map((r, i) => <li key={i}>{r}</li>) : <li>—</li>}
          </ul>
        </div>
      </div>

      {/* Technical indicators grid */}
      <div className="rounded-lg border border-border bg-card overflow-hidden border-l-4 border-l-accent-primary/50">
        <div className="p-3 flex items-center gap-2 border-b border-border">
          <BarChart3 className="w-4 h-4 text-accent-primary" />
          <span className="text-sm font-semibold text-text-primary">Technical Indicators</span>
        </div>
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded border border-border bg-bg-secondary p-2">
            <p className="text-[10px] text-text-muted">RSI (14)</p>
            <p className={`text-sm font-mono font-semibold ${(rsi.signal as string) === 'oversold' ? 'text-green-400' : (rsi.signal as string) === 'overbought' ? 'text-red-400' : 'text-text-primary'}`}>
              {typeof rsi.value === 'number' ? rsi.value.toFixed(1) : '—'}
            </p>
            <p className="text-[10px] text-text-muted capitalize">{String(rsi.signal ?? '—')}</p>
          </div>
          <div className="rounded border border-border bg-bg-secondary p-2">
            <p className="text-[10px] text-text-muted">MACD</p>
            <p className={`text-sm font-semibold capitalize ${(macd.signal as string) === 'bearish' ? 'text-red-400' : (macd.signal as string) === 'bullish' ? 'text-green-400' : 'text-text-primary'}`}>
              {String(macd.trend ?? macd.signal ?? '—')}
            </p>
            <p className="text-[10px] text-text-muted capitalize">{String(macd.signal ?? '—')}</p>
          </div>
          <div className="rounded border border-border bg-bg-secondary p-2">
            <p className="text-[10px] text-text-muted">MA Trend</p>
            <p className={`text-sm font-semibold capitalize ${String(movingAverages.trend ?? '').includes('down') ? 'text-red-400' : String(movingAverages.trend ?? '').includes('up') ? 'text-green-400' : 'text-text-primary'}`}>
              {String(movingAverages.trend ?? '—').replace(/_/g, ' ')}
            </p>
          </div>
          <div className="rounded border border-border bg-bg-secondary p-2">
            <p className="text-[10px] text-text-muted">Support</p>
            <p className="text-sm font-mono text-text-primary">
              ${typeof levels.support === 'number' ? levels.support.toFixed(2) : '—'}
            </p>
          </div>
          <div className="rounded border border-border bg-bg-secondary p-2">
            <p className="text-[10px] text-text-muted">Resistance</p>
            <p className="text-sm font-mono text-text-primary">
              ${typeof levels.resistance === 'number' ? levels.resistance.toFixed(2) : '—'}
            </p>
          </div>
          <div className="rounded border border-border bg-bg-secondary p-2 sm:col-span-2 lg:col-span-1">
            <p className="text-[10px] text-text-muted">Volatility</p>
            <p className="text-sm font-semibold capitalize text-text-primary">
              {String(volatility.level ?? '—')}
              {typeof volatility.pct === 'number' ? ` (${volatility.pct.toFixed(2)}%)` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback & timing */}
      <div className="rounded-lg border border-border bg-green-500/10 p-4">
        <p className="text-sm font-medium text-text-primary mb-2">Was this analysis helpful?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleFeedback('helpful')}
            disabled={feedbackSent}
            className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated text-sm font-medium disabled:opacity-50"
          >
            👍 Helpful
          </button>
          <button
            type="button"
            onClick={() => handleFeedback('not_helpful')}
            disabled={feedbackSent}
            className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated text-sm font-medium disabled:opacity-50"
          >
            👎 Not Helpful
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2">Analysis time: {analysisTimeMs}ms</p>
      </div>
    </div>
  );
}
