'use client';

import { useEffect, useState } from 'react';
import { Sparkles, History, Loader2, ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getMarketTypes, analyzeSymbol, getAnalysisHistory, type AnalysisDetailedResult } from '@/lib/api';
import { SelectSymbolModal } from '../ai-analysis/SelectSymbolModal';
import { toast } from 'sonner';

export function QuickAnalyzer() {
  const [marketTypes, setMarketTypes] = useState<{ value: string }[]>([]);
  const [market, setMarket] = useState('Crypto');
  const [symbol, setSymbol] = useState('');
  const [symbolName, setSymbolName] = useState('');
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisDetailedResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<{ analysis?: string; created_at?: string }[]>([]);

  useEffect(() => {
    getMarketTypes().then((types) => setMarketTypes(types)).catch(() => setMarketTypes([]));
  }, []);

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
    setAnalyzing(true);
    setAnalysisResult(null);
    setShowHistory(false);
    try {
      const result = await analyzeSymbol(market, symbol.trim(), { timeframe: '1D', language: 'en-US' });
      setAnalysisResult(result as AnalysisDetailedResult);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Analysis failed';
      toast.error(errorMsg);
      console.error('[QuickAnalyzer] Analysis error:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  const getDecisionColor = (decision?: string) => {
    if (decision === 'BUY') return 'text-success';
    if (decision === 'SELL') return 'text-error';
    return 'text-text-muted';
  };

  const getDecisionIcon = (decision?: string) => {
    if (decision === 'BUY') return <TrendingUp className="w-5 h-5" />;
    if (decision === 'SELL') return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Analyzer Card */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Symbol Selector */}
          <button
            type="button"
            onClick={() => setSelectModalOpen(true)}
            className="flex-1 inline-flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 py-3 text-sm text-text-primary hover:bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-colors"
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
                <span className="text-text-muted">Select symbol to analyze</span>
                <ChevronDown className="w-4 h-4 ml-auto text-text-muted shrink-0" />
              </>
            )}
          </button>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!symbol || analyzing}
            className="px-6 py-3 bg-accent-primary text-black font-semibold rounded-lg hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze
              </>
            )}
          </button>

          {/* History Button */}
          {symbol && (
            <button
              onClick={loadHistory}
              disabled={analyzing}
              className="px-4 py-3 border border-border rounded-lg hover:bg-bg-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="View analysis history"
            >
              <History className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Analysis Result */}
        {analysisResult && !showHistory && (
          <div className="space-y-4 pt-4 border-t border-border">
            {/* Decision Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg bg-bg-secondary ${getDecisionColor(analysisResult.decision)}`}>
                  {getDecisionIcon(analysisResult.decision)}
                </div>
                <div>
                  <div className={`text-2xl font-bold ${getDecisionColor(analysisResult.decision)}`}>
                    {analysisResult.decision || 'HOLD'}
                  </div>
                  <div className="text-sm text-text-muted">
                    Confidence: {analysisResult.confidence ? `${analysisResult.confidence}%` : 'N/A'}
                  </div>
                </div>
              </div>
              {analysisResult.analysis_time_ms && (
                <div className="text-xs text-text-muted">
                  Analysis time: {(analysisResult.analysis_time_ms / 1000).toFixed(2)}s
                </div>
              )}
            </div>

            {/* Summary */}
            {analysisResult.summary && (
              <div className="bg-bg-secondary rounded-lg p-4">
                <div className="text-sm font-medium text-text-muted mb-2">Summary</div>
                <p className="text-sm text-text-primary leading-relaxed">{analysisResult.summary}</p>
              </div>
            )}

            {/* Market Data */}
            {analysisResult.market_data && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-bg-secondary rounded-lg p-3">
                  <div className="text-xs text-text-muted mb-1">Current Price</div>
                  <div className="text-lg font-bold">${analysisResult.market_data.current_price?.toFixed(2) || 'N/A'}</div>
                </div>
                <div className="bg-bg-secondary rounded-lg p-3">
                  <div className="text-xs text-text-muted mb-1">24h Change</div>
                  <div className={`text-lg font-bold ${
                    (analysisResult.market_data.change_24h ?? 0) >= 0 ? 'text-success' : 'text-error'
                  }`}>
                    {analysisResult.market_data.change_24h ? `${analysisResult.market_data.change_24h.toFixed(2)}%` : 'N/A'}
                  </div>
                </div>
                {analysisResult.market_data.support && (
                  <div className="bg-bg-secondary rounded-lg p-3">
                    <div className="text-xs text-text-muted mb-1">Support</div>
                    <div className="text-lg font-bold text-success">${analysisResult.market_data.support.toFixed(2)}</div>
                  </div>
                )}
                {analysisResult.market_data.resistance && (
                  <div className="bg-bg-secondary rounded-lg p-3">
                    <div className="text-xs text-text-muted mb-1">Resistance</div>
                    <div className="text-lg font-bold text-error">${analysisResult.market_data.resistance.toFixed(2)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Trading Plan */}
            {analysisResult.trading_plan && (
              <div className="bg-bg-secondary rounded-lg p-4">
                <div className="text-sm font-medium text-text-muted mb-3">Trading Plan</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-text-muted mb-1">Entry Price</div>
                    <div className="font-semibold">${analysisResult.trading_plan.entry_price?.toFixed(2) || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-text-muted mb-1">Stop Loss</div>
                    <div className="font-semibold text-error">${analysisResult.trading_plan.stop_loss?.toFixed(2) || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-text-muted mb-1">Take Profit</div>
                    <div className="font-semibold text-success">${analysisResult.trading_plan.take_profit?.toFixed(2) || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-text-muted mb-1">Position Size</div>
                    <div className="font-semibold">{analysisResult.trading_plan.position_size_pct?.toFixed(1) || 'N/A'}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Reasons & Risks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {analysisResult.reasons && analysisResult.reasons.length > 0 && (
                <div className="bg-bg-secondary rounded-lg p-4">
                  <div className="text-sm font-medium text-success mb-2">Key Reasons</div>
                  <ul className="space-y-1 text-sm text-text-primary">
                    {analysisResult.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-success mt-1">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysisResult.risks && analysisResult.risks.length > 0 && (
                <div className="bg-bg-secondary rounded-lg p-4">
                  <div className="text-sm font-medium text-error mb-2">Key Risks</div>
                  <ul className="space-y-1 text-sm text-text-primary">
                    {analysisResult.risks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-error mt-1">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Scores */}
            {analysisResult.scores && (
              <div className="bg-bg-secondary rounded-lg p-4">
                <div className="text-sm font-medium text-text-muted mb-3">Analysis Scores</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Object.entries(analysisResult.scores).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-xs text-text-muted mb-1 capitalize">{key}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-bg-primary rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              value >= 70 ? 'bg-success' :
                              value >= 50 ? 'bg-accent-primary' :
                              value >= 30 ? 'bg-warning' : 'bg-error'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold min-w-[32px]">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History View */}
        {showHistory && (
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-text-muted">Analysis History</div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-xs text-accent-primary hover:text-accent-soft"
              >
                Back to Analysis
              </button>
            </div>
            {historyItems.length === 0 ? (
              <div className="text-sm text-text-muted text-center py-8">No history available</div>
            ) : (
              <div className="space-y-2">
                {historyItems.map((item, i) => (
                  <div key={i} className="bg-bg-secondary rounded-lg p-3 text-sm">
                    <div className="text-xs text-text-muted mb-1">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : 'Unknown date'}
                    </div>
                    <div className="text-text-primary line-clamp-2">{item.analysis || 'No analysis text'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Select Symbol Modal */}
      <SelectSymbolModal
        open={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        onSelect={handleSelectSymbol}
      />
    </div>
  );
}
