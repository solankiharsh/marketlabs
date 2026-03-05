'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { analyzePolymarket, getPolymarketHistory } from '@/lib/api';
import { PolymarketResults } from '@/components/ai-analysis/PolymarketResults';
import { toast } from 'sonner';

interface PolymarketAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  onAnalyzed?: () => void;
}

interface HistoryItem {
  id?: number;
  market_title?: string;
  market_url?: string;
  created_at?: string;
  recommendation?: string;
  [key: string]: unknown;
}

export function PolymarketAnalysisModal({ open, onClose, onAnalyzed }: PolymarketAnalysisModalProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (open) {
      setResult(null);
      getPolymarketHistory(1, 20)
        .then((h) => setHistory((h.items ?? []) as HistoryItem[]))
        .catch(() => setHistory([]));
    }
  }, [open]);

  const handleAnalyze = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      toast.error('Please enter a Polymarket link or market title');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await analyzePolymarket(trimmed, 'en-US');
      setResult(res.analysis ?? 'No analysis returned.');
      onAnalyzed?.();
      getPolymarketHistory(1, 20)
        .then((h) => setHistory((h.items ?? []) as HistoryItem[]))
        .catch(() => {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInput('');
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 shrink-0">
          <DialogTitle>Polymarket Prediction Market Analysis</DialogTitle>
          <DialogClose asChild>
            <button type="button" className="rounded-lg p-1 text-text-muted hover:text-text-primary" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </DialogHeader>

        <Tabs defaultValue="analyze" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="analyze" className="data-[state=active]:border-accent-primary data-[state=active]:text-accent-primary">
              Analyze
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:border-accent-primary data-[state=active]:text-accent-primary">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="mt-4 flex-1 min-h-0 overflow-auto">
            <div className="rounded-lg bg-accent-primary/10 border border-accent-primary/20 p-3 flex gap-2 mb-4">
              <Info className="h-5 w-5 shrink-0 text-accent-primary" />
              <p className="text-sm text-text-primary">
                Please enter a Polymarket link or market title
              </p>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='e.g. https://polymarket.com/event/xxx or "Bitcoin price above $100k in 2025?"'
              rows={4}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-text-primary placeholder:text-text-muted resize-y mb-4"
            />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !input.trim()}
              className="w-full rounded-lg bg-accent-primary/20 border border-accent-primary/40 px-4 py-3 text-sm font-medium text-accent-primary hover:bg-accent-primary/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Analyzing…' : 'Start Analysis'}
            </button>
            {result != null && (
              <div className="mt-4">
                <PolymarketResults analysis={result} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 flex-1 min-h-0 overflow-auto">
            <ul className="space-y-2">
              {history.length === 0 ? (
                <li className="text-text-muted text-sm py-4">No history yet</li>
              ) : (
                history.map((item, i) => (
                  <li
                    key={item.id ?? i}
                    className="rounded-lg border border-border bg-bg-secondary p-3 text-sm text-text-secondary"
                  >
                    <p className="font-medium text-text-primary truncate">
                      {String(item.market_title ?? item.market_url ?? 'Analysis')}
                    </p>
                    {item.created_at && (
                      <p className="text-xs text-text-muted mt-1">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    )}
                    {item.recommendation && (
                      <p className="text-xs mt-1">Recommendation: {String(item.recommendation)}</p>
                    )}
                  </li>
                ))
              )}
            </ul>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
