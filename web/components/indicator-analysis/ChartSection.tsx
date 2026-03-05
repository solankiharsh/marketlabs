'use client';

/**
 * ChartSection — Trading chart "graph section" for Indicator Analysis page.
 * Composes: market/symbol selector, timeframe bar, indicator toggles, OHLCV bar,
 * KLineCharts (candlestick + volume + indicator panes), left drawing toolbar, right price panel.
 * Theme: dark & gold (MarketLabs) by default.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { KLineData } from 'klinecharts';
import { fetchOHLCV, fetchRealtimePrice, generateMockData } from '@/lib/chart-data';
import { useKlineChart, INDICATOR_PANE_ORDER, type CustomIndicatorOverlay } from '@/hooks/use-kline-chart';
import { type TimeframeValue } from './TimeframeBar';
import { IndicatorToggles } from './IndicatorToggles';
import { OHLCVInfoBar } from './OHLCVInfoBar';
import { ChartToolbar, DRAWING_TOOL_OVERLAY } from './ChartToolbar';
import type { ExecuteIndicatorOutput } from '@/lib/api';

const PERIOD_MAP: Record<TimeframeValue, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1H': '1h',
  '4H': '4h',
  '1D': 'd',
  '1W': 'w',
};

export interface ChartSectionProps {
  /** Dark & gold theme (default true) */
  dark?: boolean;
  /** Controlled: when set, use these and report changes (e.g. for syncing with TechnicalIndicatorsSidebar) */
  market?: string;
  symbol?: string;
  timeframe?: TimeframeValue;
  onMarketChange?: (m: string) => void;
  onSymbolChange?: (s: string) => void;
  onTimeframeChange?: (tf: TimeframeValue) => void;
  /** When Add is clicked in watchlist dropdown */
  onAddToWatchlist?: () => void;
  /** Called when price/change updates (e.g. for PriceDisplay above Technical Indicators) */
  onPriceUpdate?: (data: { price?: number; changePercent?: number }) => void;
  /** When set, strategy is active on chart (name + signals summary shown; chart data may include signal markers) */
  indicatorOutput?: ExecuteIndicatorOutput | null;
}

export function ChartSection({
  dark = true,
  market: controlledMarket,
  symbol: controlledSymbol,
  timeframe: controlledTimeframe,
  onMarketChange,
  onSymbolChange,
  onTimeframeChange,
  onAddToWatchlist,
  onPriceUpdate,
  indicatorOutput,
}: ChartSectionProps) {
  const [internalMarket, setInternalMarket] = useState('Crypto');
  const [internalSymbol, setInternalSymbol] = useState('BTC/USDT');
  const [internalTimeframe, setInternalTimeframe] = useState<TimeframeValue>('1D');

  const market = controlledMarket ?? internalMarket;
  const symbol = controlledSymbol ?? internalSymbol;
  const timeframe = controlledTimeframe ?? internalTimeframe;
  const setMarket = onMarketChange ?? setInternalMarket;
  const setSymbol = onSymbolChange ?? setInternalSymbol;
  const setTimeframe = onTimeframeChange ?? setInternalTimeframe;
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set());
  const [ohlcvCandle, setOhlcvCandle] = useState<KLineData | null>(null);
  const [drawingTool, setDrawingTool] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<{ price?: number; changePercent?: number }>({});
  const [loading, setLoading] = useState(true);
  const [lastCandle, setLastCandle] = useState<KLineData | null>(null);
  const dataRef = useRef<KLineData[]>([]);
  const rawDataRef = useRef<KLineData[]>([]);

  useEffect(() => {
    onPriceUpdate?.(priceData);
  }, [priceData, onPriceUpdate]);

  const {
    containerRef,
    setData,
    setIndicators,
    setCustomIndicatorOverlay,
    updateLastCandle,
    onCrosshair,
    setDrawingTool: setChartDrawingTool,
    removeOverlay,
  } = useKlineChart({ dark, height: 480 });

  // Crosshair → OHLCV bar
  onCrosshair((data) => setOhlcvCandle(data));

  // Merge strategy signals into candle data for chart (buy/sell markers by index)
  const mergeIndicatorSignals = useCallback((data: KLineData[]): KLineData[] => {
    if (!indicatorOutput?.signals?.length || data.length === 0) return data;
    const buySignal = indicatorOutput.signals.find((s) => s.type === 'buy');
    const sellSignal = indicatorOutput.signals.find((s) => s.type === 'sell');
    return data.map((candle, i) => {
      const out = { ...candle } as KLineData & { buy?: boolean; sell?: boolean };
      if (buySignal?.data?.[i]) out.buy = true;
      if (sellSignal?.data?.[i]) out.sell = true;
      return out;
    });
  }, [indicatorOutput]);

  // Fetch OHLCV when market, symbol, or timeframe changes
  const loadData = useCallback(() => {
    if (!market || !symbol) return;
    setLoading(true);
    const period = PERIOD_MAP[timeframe];
    fetchOHLCV(market, symbol, period, 300)
      .then((data) => {
        const raw = data.length > 0 ? data : generateMockData(200);
        rawDataRef.current = raw;
        const chartData = mergeIndicatorSignals(raw);
        dataRef.current = chartData;
        setData(chartData);
        setLastCandle(chartData[chartData.length - 1] ?? null);
        setIndicators(activeIndicators);
      })
      .catch(() => {
        const mock = generateMockData(200);
        rawDataRef.current = mock;
        dataRef.current = mergeIndicatorSignals(mock);
        setData(dataRef.current);
        setLastCandle(dataRef.current[dataRef.current.length - 1] ?? null);
        setIndicators(activeIndicators);
      })
      .finally(() => setLoading(false));
  }, [market, symbol, timeframe, setData, setIndicators, activeIndicators, mergeIndicatorSignals]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When strategy output changes, re-merge signals into current raw data and update custom overlay
  useEffect(() => {
    const raw = rawDataRef.current;
    if (raw.length > 0) {
      const chartData = mergeIndicatorSignals(raw);
      dataRef.current = chartData;
      setData(chartData);
      setLastCandle(chartData[chartData.length - 1] ?? null);
    }

    if (!indicatorOutput) {
      setCustomIndicatorOverlay(null);
      return;
    }

    const candles = rawDataRef.current;
    if (candles.length === 0) return;

    const lines = (indicatorOutput.plots ?? [])
      .filter((p) => p.overlay)
      .map((p) => ({
        name: p.name,
        data: p.data ?? [],
        color: p.color || '#D4A843',
      }));

    const signalPoints: CustomIndicatorOverlay['signalPoints'] = [];
    (indicatorOutput.signals ?? []).forEach((sig) => {
      const type = sig.type === 'buy' ? 'B' : 'S';
      (sig.data ?? []).forEach((val, i) => {
        if (val != null && val !== 0 && candles[i]) {
          signalPoints.push({
            timestamp: candles[i].timestamp,
            value: candles[i].close,
            type,
          });
        }
      });
    });

    setCustomIndicatorOverlay({ lines, signalPoints });
  }, [indicatorOutput, mergeIndicatorSignals, setData, setCustomIndicatorOverlay]);

  // When indicators change, re-apply (chart already has data)
  useEffect(() => {
    const chart = containerRef.current && dataRef.current.length > 0;
    if (chart) setIndicators(activeIndicators);
  }, [activeIndicators, setIndicators]);

  // Realtime price poll (every 10s)
  useEffect(() => {
    if (!market || !symbol) return;
    const fetch = () => {
      fetchRealtimePrice(market, symbol)
        .then((d) => setPriceData({ price: d.price ?? (d as { close?: number }).close, changePercent: d.changePercent ?? (d as { change_percent?: number }).change_percent }))
        .catch(() => {});
    };
    fetch();
    const t = setInterval(fetch, 10000);
    return () => clearInterval(t);
  }, [market, symbol]);

  // Drawing tool → KLineCharts overlay
  useEffect(() => {
    if (!drawingTool) return;
    const overlayType = DRAWING_TOOL_OVERLAY[drawingTool];
    if (overlayType) setChartDrawingTool(overlayType);
  }, [drawingTool, setChartDrawingTool]);

  const handleToggleIndicator = useCallback((name: string) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleDrawingTool = useCallback((id: string | null) => {
    setDrawingTool(id);
  }, []);

  const buyCount = indicatorOutput?.signals?.find((s) => s.type === 'buy')?.data?.filter((v) => v != null && v !== 0).length ?? 0;
  const sellCount = indicatorOutput?.signals?.find((s) => s.type === 'sell')?.data?.filter((v) => v != null && v !== 0).length ?? 0;

  return (
    <div className={`rounded-xl border ${dark ? 'border-[#2A3040] bg-[#0F1117]' : 'border-gray-200 bg-white'}`}>
      {/* Strategy applied badge + Indicator toggles */}
      <div className="px-3 py-2 border-b border-[#2A3040] space-y-2">
        {indicatorOutput && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-accent-primary bg-accent-primary/10 px-2 py-1 rounded">
              Strategy: {indicatorOutput.name}
            </span>
            {(buyCount > 0 || sellCount > 0) && (
              <span className="text-xs text-text-muted">
                {buyCount} buy · {sellCount} sell
              </span>
            )}
          </div>
        )}
        <IndicatorToggles active={activeIndicators} onToggle={handleToggleIndicator} dark={dark} />
      </div>

      {/* OHLCV info bar: crosshair candle when hovering, latest candle when idle */}
      <OHLCVInfoBar candle={ohlcvCandle ?? lastCandle} />

      {/* Chart + Left toolbar + Right price; height grows with indicator panes so each stays readable */}
      {(() => {
        const subPaneCount = INDICATOR_PANE_ORDER.filter((id) => activeIndicators.has(id)).length;
        const chartMinHeight = Math.max(480, 400 + 80 * (1 + subPaneCount));
        return (
      <div className="flex gap-0 min-h-[480px]">
        <ChartToolbar activeId={drawingTool} onToolSelect={handleDrawingTool} onDeleteClick={() => removeOverlay()} dark={dark} />
        <div className="flex-1 min-w-0 flex flex-col relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0F1117]/80 text-[#6B7280] text-sm">
              Loading chart...
            </div>
          )}
          <div
            ref={containerRef}
            className="w-full flex-1"
            style={{ minHeight: chartMinHeight }}
          />
        </div>
      </div>
        );
      })()}
    </div>
  );
}
