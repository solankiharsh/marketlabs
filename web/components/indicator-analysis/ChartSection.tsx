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
import { useKlineChart, INDICATOR_PANE_ORDER } from '@/hooks/use-kline-chart';
import { type TimeframeValue } from './TimeframeBar';
import { IndicatorToggles } from './IndicatorToggles';
import { OHLCVInfoBar } from './OHLCVInfoBar';
import { ChartToolbar, DRAWING_TOOL_OVERLAY } from './ChartToolbar';

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
  const dataRef = useRef<KLineData[]>([]);

  useEffect(() => {
    onPriceUpdate?.(priceData);
  }, [priceData, onPriceUpdate]);

  const {
    containerRef,
    setData,
    setIndicators,
    updateLastCandle,
    onCrosshair,
    setDrawingTool: setChartDrawingTool,
    removeOverlay,
  } = useKlineChart({ dark, height: 480 });

  // Crosshair → OHLCV bar
  onCrosshair((data) => setOhlcvCandle(data));

  // Fetch OHLCV when market, symbol, or timeframe changes
  const loadData = useCallback(() => {
    if (!market || !symbol) return;
    setLoading(true);
    const period = PERIOD_MAP[timeframe];
    fetchOHLCV(market, symbol, period, 300)
      .then((data) => {
        dataRef.current = data;
        setData(data);
        setIndicators(activeIndicators);
        if (data.length === 0) {
          const mock = generateMockData(200);
          dataRef.current = mock;
          setData(mock);
        }
      })
      .catch(() => {
        const mock = generateMockData(200);
        dataRef.current = mock;
        setData(mock);
        setIndicators(activeIndicators);
      })
      .finally(() => setLoading(false));
  }, [market, symbol, timeframe, setData, setIndicators, activeIndicators]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  return (
    <div className={`rounded-xl border ${dark ? 'border-[#2A3040] bg-[#0F1117]' : 'border-gray-200 bg-white'}`}>
      {/* Indicator toggles */}
      <div className="px-3 py-2 border-b border-[#2A3040]">
        <IndicatorToggles active={activeIndicators} onToggle={handleToggleIndicator} dark={dark} />
      </div>

      {/* OHLCV info bar */}
      <OHLCVInfoBar candle={ohlcvCandle} />

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
