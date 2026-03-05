'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Zap, Check, Loader2 } from 'lucide-react';

const STEPS = [
  'Fetching real-time data',
  'Calculating indicators',
  'AI deep analysis',
  'Generating report',
] as const;

export interface AIAnalyzingPanelProps {
  /** When true, panel is expanded */
  expanded: boolean;
  onToggle: () => void;
  /** 0–100 */
  progress: number;
  /** 0-based index of current step */
  currentStepIndex: number;
  /** Elapsed seconds */
  elapsedSeconds: number;
  /** Analysis in progress */
  isAnalyzing: boolean;
  /** When analyzing, show this symbol context (e.g. "Crypto / BTC") */
  symbolLabel?: string;
}

export function AIAnalyzingPanel({
  expanded,
  onToggle,
  progress,
  currentStepIndex,
  elapsedSeconds,
  isAnalyzing,
  symbolLabel,
}: AIAnalyzingPanelProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-2.5 border-b border-border bg-bg-secondary/50 hover:bg-bg-elevated/50 transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="w-4 h-4 text-accent-primary shrink-0" />
          <span className="text-sm font-semibold text-text-primary truncate">
            AI is analyzing{symbolLabel ? ` ${symbolLabel}` : '…'}
          </span>
          {isAnalyzing && (
            <span className="text-xs text-text-muted font-normal">
              {progress}%
            </span>
          )}
        </div>
        <span className="p-1 rounded text-text-muted hover:text-text-primary shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="p-4 space-y-4">
            {isAnalyzing && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
                    <div
                      className="h-full bg-accent-primary rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                </div>
                <ul className="space-y-2">
                  {STEPS.map((label, i) => {
                    const done = i < currentStepIndex;
                    const active = i === currentStepIndex;
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
                {mounted && (
                  <p className="text-xs text-text-muted tabular-nums">
                    {elapsedSeconds}s
                  </p>
                )}
              </>
            )}
            {!isAnalyzing && expanded && (
              <p className="text-sm text-text-muted">
                Select a symbol and click Analyze to run AI analysis, or click a symbol from the radar or watchlist.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
