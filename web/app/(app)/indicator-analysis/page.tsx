'use client';

import { useState, useCallback } from 'react';
import { Zap, Radio } from 'lucide-react';
import { ChartSection } from '@/components/indicator-analysis/ChartSection';
import type { TimeframeValue } from '@/components/indicator-analysis/TimeframeBar';
import { SymbolTimeframeRow } from '@/components/indicator-analysis/SymbolTimeframeRow';
import { PriceInline } from '@/components/indicator-analysis/PriceInline';
import { TechnicalIndicatorsSidebar } from '@/components/indicator-analysis/TechnicalIndicatorsSidebar';
import { QuickTradePanel } from '@/components/indicator-analysis/QuickTradePanel';
import { AddToWatchlistModal } from '@/components/indicator-analysis/AddToWatchlistModal';
import { BacktestHistoryModal } from '@/components/indicator-analysis/BacktestHistoryModal';
import { CreateIndicatorOverlay } from '@/components/indicator-analysis/CreateIndicatorOverlay';
import { useWatchlist } from '@/hooks/use-watchlist';
import type { ExecuteIndicatorOutput, IndicatorItem } from '@/lib/api';

export default function IndicatorAnalysisPage() {
  const [market, setMarket] = useState<string>('Crypto');
  const [symbol, setSymbol] = useState<string>('BTC/USDT');
  const [timeframe, setTimeframe] = useState<TimeframeValue>('1D');
  const [quickTradeOpen, setQuickTradeOpen] = useState(false);
  const [addWatchlistModalOpen, setAddWatchlistModalOpen] = useState(false);
  const [executedIndicatorOutput, setExecutedIndicatorOutput] = useState<ExecuteIndicatorOutput | null>(null);
  const [backtestModalIndicator, setBacktestModalIndicator] = useState<IndicatorItem | null>(null);
  const [createIndicatorOverlayOpen, setCreateIndicatorOverlayOpen] = useState(false);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [realtimeUpdates, setRealtimeUpdates] = useState(true);
  const [priceData, setPriceData] = useState<{ price?: number; changePercent?: number }>({});

  const { add: watchlistAdd, entries: watchlistEntries, getPrice: getWatchlistPrice } = useWatchlist();

  const handleAddToWatchlistConfirm = useCallback(
    (m: string, s: string, name?: string) => {
      watchlistAdd(m, s, name);
      setMarket(m);
      setSymbol(s);
    },
    [watchlistAdd]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-display font-bold text-text-primary">Indicator Analysis</h1>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
          <span className="sr-only">Realtime updates</span>
          <Radio
            className={`w-4 h-4 shrink-0 ${realtimeUpdates ? 'text-accent-primary' : 'text-text-muted'}`}
            aria-hidden
          />
          <input
            type="checkbox"
            checked={realtimeUpdates}
            onChange={(e) => setRealtimeUpdates(e.target.checked)}
            className="sr-only"
            aria-label="Realtime updates"
          />
          <span>Realtime updates</span>
        </label>
      </div>

      <AddToWatchlistModal
        open={addWatchlistModalOpen}
        onClose={() => setAddWatchlistModalOpen(false)}
        onConfirm={handleAddToWatchlistConfirm}
      />

      <div className="flex gap-4 transition-[height] duration-300 ease-in-out">
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Cryptocurrency + BTC/USDT + timeframes + price inline — above the chart */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[#2A3040] bg-[#0F1117]">
            <SymbolTimeframeRow
              market={market}
              symbol={symbol}
              timeframe={timeframe}
              onMarketChange={setMarket}
              onSymbolChange={setSymbol}
              onTimeframeChange={setTimeframe}
              entries={watchlistEntries}
              getPrice={getWatchlistPrice ?? (() => undefined)}
              onAddClick={() => setAddWatchlistModalOpen(true)}
              dark
            />
            <PriceInline
              symbol={symbol}
              market={market}
              price={priceData.price}
              changePercent={priceData.changePercent}
              onQuickTrade={() => setQuickTradeOpen(true)}
              dark
            />
          </div>
          <ChartSection
            dark
            market={market}
            symbol={symbol}
            timeframe={timeframe}
            onMarketChange={setMarket}
            onSymbolChange={setSymbol}
            onTimeframeChange={setTimeframe}
            onAddToWatchlist={() => setAddWatchlistModalOpen(true)}
            onPriceUpdate={setPriceData}
          />
        </div>
        <div className="w-[300px] shrink-0">
          <TechnicalIndicatorsSidebar
            market={market}
            symbol={symbol}
            timeframe={timeframe}
            onExecuteIndicator={setExecutedIndicatorOutput}
            onBacktestClick={(ind) => setBacktestModalIndicator(ind)}
            onOpenCreateIndicator={() => setCreateIndicatorOverlayOpen(true)}
            refreshTrigger={sidebarRefreshTrigger}
          />
        </div>
      </div>

      <CreateIndicatorOverlay
        open={createIndicatorOverlayOpen}
        onClose={() => setCreateIndicatorOverlayOpen(false)}
        onSaved={() => setSidebarRefreshTrigger((t) => t + 1)}
      />

      {quickTradeOpen && (
        <QuickTradePanel
          market={market}
          symbol={symbol}
          onClose={() => setQuickTradeOpen(false)}
          onSymbolChange={setSymbol}
        />
      )}

      <BacktestHistoryModal
        open={!!backtestModalIndicator}
        onClose={() => setBacktestModalIndicator(null)}
        indicator={backtestModalIndicator}
        symbol={symbol}
        timeframe={timeframe}
      />

      <button
        type="button"
        onClick={() => setQuickTradeOpen(true)}
        aria-label="Quick Trade"
        title="Quick Trade"
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-[#D4A843] text-[#0F1117] shadow-lg shadow-amber-500/25 hover:bg-[#c49b3c] hover:shadow-amber-500/40 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0F1117]"
      >
        <Zap className="w-6 h-6 stroke-[2.5]" fill="currentColor" />
      </button>
    </div>
  );
}
