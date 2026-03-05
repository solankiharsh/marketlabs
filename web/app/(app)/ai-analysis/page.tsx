'use client';

import { useState, useCallback, useRef } from 'react';
import { Sparkles, Clock, Crosshair } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { OpportunityRadar } from '@/components/ai-analysis/OpportunityRadar';
import { MarketIndicesTicker } from '@/components/ai-analysis/MarketIndicesTicker';
import { MarketSentimentPanel } from '@/components/ai-analysis/MarketSentimentPanel';
import { HeatmapGrid } from '@/components/ai-analysis/HeatmapGrid';
import { EconomicCalendar } from '@/components/ai-analysis/EconomicCalendar';
import { SymbolAnalyzer } from '@/components/ai-analysis/SymbolAnalyzer';
import { WatchlistPanel } from '@/components/ai-analysis/WatchlistPanel';
import { AssetPoolTab } from '@/components/ai-analysis/AssetPoolTab';
import { PredictionMarketsTab } from '@/components/ai-analysis/PredictionMarketsTab';
import { analyzeSymbol, type AnalysisDetailedResult } from '@/lib/api';
import { toast } from 'sonner';
import type { TimeframeValue } from '@/components/indicator-analysis/TimeframeBar';

export default function AIAnalysisPage() {
  const [selectedMarket, setSelectedMarket] = useState<string | undefined>();
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>();
  const [analysisTimeframe, setAnalysisTimeframe] = useState<TimeframeValue>('1D');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [analysisElapsedSec, setAnalysisElapsedSec] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisDetailedResult | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAnalysis = useCallback(
    (market: string, symbol: string, options?: { timeframe?: string }) => {
      const tf = options?.timeframe ?? analysisTimeframe;
      setSelectedMarket(market);
      setSelectedSymbol(symbol);
      setIsAnalyzing(true);
      setAnalysisResult(null);
      setAnalysisProgress(0);
      setAnalysisStepIndex(0);
      setAnalysisElapsedSec(0);

      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);

      elapsedIntervalRef.current = setInterval(() => {
        setAnalysisElapsedSec((s) => {
          const next = s + 1;
          const progress = Math.min(95, next * 3);
          setAnalysisProgress(progress);
          setAnalysisStepIndex(progress >= 75 ? 3 : progress >= 50 ? 2 : progress >= 25 ? 1 : 0);
          return next;
        });
      }, 1000);

      analyzeSymbol(market, symbol, { timeframe: tf })
      .then((result) => {
        if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
        setAnalysisProgress(100);
        setAnalysisStepIndex(3);
        setAnalysisResult(result as AnalysisDetailedResult);
        setIsAnalyzing(false);
      })
      .catch((e) => {
        if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
        setIsAnalyzing(false);
        toast.error(e instanceof Error ? e.message : 'Analysis failed');
      });
    },
    [analysisTimeframe]
  );

  const handleSelectSymbol = useCallback((market: string, symbol: string) => {
    setSelectedMarket(market);
    setSelectedSymbol(symbol);
    startAnalysis(market, symbol);
  }, [startAnalysis]);

  const handleAnalyzeFromRadar = useCallback((market: string, symbol: string) => {
    startAnalysis(market, symbol);
  }, [startAnalysis]);

  const symbolLabel =
    selectedMarket && selectedSymbol
      ? `${selectedMarket}:${selectedSymbol}`
      : undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-text-primary">AI Asset Analysis</h1>

      <OpportunityRadar onAnalyze={handleAnalyzeFromRadar} />

      <MarketIndicesTicker />

      <MarketSentimentPanel />

      <Tabs defaultValue="instant" className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto gap-0">
          <TabsTrigger
            value="instant"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent data-[state=active]:text-accent-primary flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Instant Analysis
          </TabsTrigger>
          <TabsTrigger
            value="asset-pool"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent data-[state=active]:text-accent-primary flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Asset Pool & Scheduled Tasks
          </TabsTrigger>
          <TabsTrigger
            value="prediction"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary data-[state=active]:bg-transparent data-[state=active]:text-accent-primary flex items-center gap-2"
          >
            <Crosshair className="w-4 h-4" />
            Prediction Markets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instant" className="mt-4">
          <div className="flex flex-col lg:flex-row gap-4 w-full">
            <aside className="w-full lg:w-72 shrink-0 space-y-4 order-2 lg:order-1">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-text-primary">Heatmap</h3>
                <HeatmapGrid />
              </section>
              <EconomicCalendar />
            </aside>
            <main className="flex-1 min-w-0 order-1 lg:order-2">
              <SymbolAnalyzer
                selectedMarket={selectedMarket}
                selectedSymbol={selectedSymbol}
                timeframe={analysisTimeframe}
                onTimeframeChange={setAnalysisTimeframe}
                onAnalyzeRequest={startAnalysis}
                externalAnalyzing={isAnalyzing}
                externalResult={analysisResult}
                externalProgress={analysisProgress}
                externalStepIndex={analysisStepIndex}
                externalElapsedSec={analysisElapsedSec}
                symbolLabel={symbolLabel}
              />
            </main>
            <aside className="w-full lg:w-64 shrink-0 order-3">
              <WatchlistPanel onSelectSymbol={handleSelectSymbol} />
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="asset-pool" className="mt-4">
          <AssetPoolTab />
        </TabsContent>
        <TabsContent value="prediction" className="mt-4">
          <PredictionMarketsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
