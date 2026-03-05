'use client';

import { useState, useEffect } from 'react';
import { Crosshair, Sparkles } from 'lucide-react';
import { getPolymarketHistory } from '@/lib/api';
import { PolymarketAnalysisModal } from '@/components/ai-analysis/PolymarketAnalysisModal';

interface HistoryItem {
  id?: number;
  market_title?: string;
  market_url?: string;
  created_at?: string;
  recommendation?: string;
  [key: string]: unknown;
}

export function PredictionMarketsTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = () => {
    getPolymarketHistory(1, 20)
      .then((h) => setHistory((h.items ?? []) as HistoryItem[]))
      .catch(() => setHistory([]));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-8 flex flex-col items-center justify-center text-center min-h-[280px]">
        <div className="rounded-full bg-accent-primary/10 p-4 mb-4">
          <Crosshair className="h-10 w-10 text-accent-primary" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Polymarket Prediction Market Analysis
        </h2>
        <p className="text-text-muted text-sm max-w-md mb-6">
          Enter a Polymarket link or market title, and AI will analyze trading opportunities for you
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-accent-primary/20 border border-accent-primary/40 px-4 py-3 text-sm font-medium text-accent-primary hover:bg-accent-primary/30 flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Start Analysis
        </button>
      </div>

      {history.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-3">Recent analyses</h3>
          <ul className="space-y-2">
            {history.slice(0, 10).map((item, i) => (
              <li
                key={item.id ?? i}
                className="rounded-lg border border-border bg-card p-3 text-sm text-text-secondary hover:bg-bg-elevated/50 transition-colors"
              >
                <p className="font-medium text-text-primary truncate">
                  {String(item.market_title ?? item.market_url ?? 'Analysis')}
                </p>
                {item.created_at && (
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PolymarketAnalysisModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAnalyzed={loadHistory}
      />
    </div>
  );
}
