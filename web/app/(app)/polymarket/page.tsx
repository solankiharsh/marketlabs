'use client';

import { useState, useEffect } from 'react';
import { getMarketConfig } from '@/lib/api';
import { analyzePolymarket, getPolymarketHistory } from '@/lib/api';
import { toast } from 'sonner';

export default function PolymarketPage() {
  const [input, setInput] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMarketConfig().then((c) => setModels(c.models ?? {})).catch(() => setModels({}));
  }, []);

  useEffect(() => {
    getPolymarketHistory(1, 20).then((h) => setHistory(h.items)).catch(() => setHistory([]));
  }, []);

  const handleAnalyze = async () => {
    if (!input.trim()) {
      toast.error('Enter a Polymarket URL or market title');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await analyzePolymarket(input.trim(), 'en-US', model || undefined);
      setResult(res.analysis ?? 'No analysis returned.');
      getPolymarketHistory(1, 20).then((h) => setHistory(h.items));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const modelOptions = Object.entries(models);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-display font-bold">Polymarket</h1>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">URL or market title</label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://polymarket.com/event/... or market title"
            className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary placeholder:text-text-muted"
          />
        </div>
        {modelOptions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            >
              <option value="">Default</option>
              {modelOptions.map(([k, v]) => (
                <option key={k} value={k}>
                  {v || k}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {result != null && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-2">Analysis</h2>
          <div className="prose prose-invert max-w-none text-sm text-text-secondary whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">History</h2>
        <ul className="space-y-2">
          {(history as Record<string, unknown>[]).map((h, i) => (
            <li key={i} className="rounded-lg border border-border bg-card p-3 text-sm text-text-secondary">
              {String(h.input ?? h.created_at ?? JSON.stringify(h))}
            </li>
          ))}
          {history.length === 0 && <li className="text-text-muted text-sm">No history yet</li>}
        </ul>
      </div>
    </div>
  );
}
