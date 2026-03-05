'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Star } from 'lucide-react';
import {
  getAnalysisHistory,
  analyzeSymbol,
  addToWatchlist,
  getWatchlist,
  type FastAnalysisResult,
  type FastAnalysisHistoryItem,
} from '@/lib/api';
import { PriceChart } from '@/components/market/PriceChart';
import { toast } from 'sonner';

export default function AssetDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const symbolParam = params.symbol as string;
  const symbol = symbolParam?.replace(/-/g, '/') ?? '';
  const market = searchParams.get('market') || 'Crypto';

  const [timeframe, setTimeframe] = useState<string>('1D');
  const [analysis, setAnalysis] = useState<FastAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [history, setHistory] = useState<FastAnalysisHistoryItem[]>([]);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [displayName, setDisplayName] = useState<string>(symbol);

  useEffect(() => {
    getWatchlist()
      .then((list) => {
        const found = list.some((w) => w.market === market && w.symbol === symbol);
        setInWatchlist(found);
      })
      .catch(() => setInWatchlist(false));
  }, [market, symbol]);

  const handleAddWatchlist = async () => {
    if (inWatchlist) return;
    setWatchlistLoading(true);
    try {
      await addToWatchlist(market, symbol, displayName || undefined);
      setInWatchlist(true);
      toast.success('Added to watchlist');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add to watchlist');
    } finally {
      setWatchlistLoading(false);
    }
  };

  useEffect(() => {
    getAnalysisHistory(market, symbol, 7, 10)
      .then((res) => setHistory(res.items ?? []))
      .catch(() => setHistory([]));
  }, [market, symbol]);

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysis(null);
    try {
      const result = await analyzeSymbol(market, symbol, { timeframe });
      setAnalysis(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <Link
          href="/market"
          className="p-2 hover:bg-white/[0.05] rounded transition-colors"
          aria-label="Back to markets"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-display font-bold truncate">{displayName || symbol}</h1>
          <div className="text-sm text-text-muted">{symbol} · {market}</div>
        </div>
        <button
          onClick={handleAddWatchlist}
          disabled={inWatchlist || watchlistLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated disabled:opacity-50 text-sm"
        >
          <Star className={`w-4 h-4 ${inWatchlist ? 'fill-accent-primary text-accent-primary' : ''}`} />
          {inWatchlist ? 'In watchlist' : watchlistLoading ? 'Adding...' : 'Add to watchlist'}
        </button>
      </div>

      <PriceChart
        market={market}
        symbol={symbol}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        height={500}
        displayName={displayName}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent-primary" />
                Fast AI analysis
              </h3>
              <button
                onClick={runAnalysis}
                disabled={analysisLoading}
                className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium hover:bg-accent-primary/30 disabled:opacity-50 text-sm"
              >
                {analysisLoading ? 'Analyzing...' : 'Run analysis'}
              </button>
            </div>
            {analysis?.error && (
              <p className="text-error text-sm mb-2">{analysis.error}</p>
            )}
            {analysis && !analysis.error && (
              <div className="prose prose-invert max-w-none text-sm text-text-secondary whitespace-pre-wrap">
                {analysis.analysis ?? analysis.summary ?? analysis.recommendation ?? 'No analysis text.'}
              </div>
            )}
            {!analysis && !analysisLoading && (
              <p className="text-text-muted text-sm">Click &quot;Run analysis&quot; to get AI insights for this symbol.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-3">Analysis history</h3>
            {history.length === 0 ? (
              <p className="text-text-muted text-sm">No past analyses yet.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-auto">
                {history.map((item, i) => (
                  <li key={item.id ?? i} className="text-sm text-text-secondary border-b border-border/50 pb-2 last:border-0">
                    {item.analysis ? (
                      <p className="line-clamp-2">{item.analysis}</p>
                    ) : (
                      <p className="text-text-muted">—</p>
                    )}
                    {item.created_at && (
                      <span className="text-xs text-text-muted">{new Date(item.created_at).toLocaleString()}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
