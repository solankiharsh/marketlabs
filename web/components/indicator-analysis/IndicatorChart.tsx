'use client';

/**
 * Indicator chart using KLineCharts (klinecharts).
 * To revert to lightweight-charts: see the commented block at the bottom of this file
 * and the backup IndicatorChart.lightweight-charts.backup.tsx (if present).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
/* ========== lightweight-charts (commented out for KLineCharts; uncomment to revert) ==========
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, LineData, HistogramData, Time } from 'lightweight-charts';
*/
import { init, dispose, ActionType, CandleType } from 'klinecharts';
import type { KLineData } from 'klinecharts';
import { getKlineData, normalizeKlines, type OHLCVCandle, type ExecuteIndicatorOutput } from '@/lib/api';
import { sma, ema, bbands, rsi, atr, macd } from './indicatorCalculations';

/** Map our indicator names to KLineCharts built-in indicator names. */
const OUR_TO_KLC: Record<string, string> = {
  SMA: 'MA',
  EMA: 'EMA',
  BB: 'BOLL',
  RSI: 'RSI',
  MACD: 'MACD',
  ATR: 'ATR',
  CCI: 'CCI',
  'W%R': 'WR',
  KDJ: 'KDJ',
  OBV: 'OBV',
  ADX: 'DMI',
  MFI: 'VR',
  ADOSC: 'EMV',
  AD: 'PVT',
};

export interface IndicatorLegendEntry {
  name: string;
  value: number;
}

/** Map our drawing tool ids to KLineCharts overlay type names */
const DRAWING_TOOL_TO_OVERLAY: Record<string, string> = {
  hline: 'priceLine',
  vline: 'verticalSegment',
  trend: 'straightLine',
  measure: 'segment',
  arrow: 'straightLine',
  parallel: 'parallelStraightLine',
  fib: 'fibonacciLine',
  rect: 'priceChannelLine',
  label: 'priceLine',
  freehand: 'straightLine',
};

const KLINE_REFRESH_MS = 60_000;

interface IndicatorChartProps {
  market: string;
  symbol: string;
  timeframe: string;
  activeIndicators: Set<string>;
  onOhlcvHover: (candle: OHLCVCandle | null) => void;
  onIndicatorLegend?: (entries: IndicatorLegendEntry[]) => void;
  executedIndicatorOutput?: ExecuteIndicatorOutput | null;
  /** Active drawing tool id from DrawingToolbar; when set, chart creates overlay for drawing */
  drawingTool?: string | null;
  /** When true, refetch kline data periodically for live chart updates */
  realtimeUpdates?: boolean;
}

const CHART_HEIGHT = 480;

function toKLineData(candles: OHLCVCandle[]): KLineData[] {
  return candles.map((c) => {
    const ts = c.time >= 1e12 ? c.time : c.time * 1000;
    return {
      timestamp: ts,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    };
  });
}

export function IndicatorChart({
  market,
  symbol,
  timeframe,
  activeIndicators,
  onOhlcvHover,
  onIndicatorLegend,
  executedIndicatorOutput: _executedIndicatorOutput,
  drawingTool,
  realtimeUpdates = true,
}: IndicatorChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof init> | null>(null);
  const indicatorPaneIdsRef = useRef<Map<string, string>>(new Map());
  const [ohlcvData, setOhlcvData] = useState<OHLCVCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | false>(false);
  const ohlcvRef = useRef<OHLCVCandle[]>([]);
  ohlcvRef.current = ohlcvData;

  const fetchKline = useCallback(() => {
    if (!market || !symbol) return;
    getKlineData(market, symbol, timeframe, 300)
      .then((raw) => {
        const norm = normalizeKlines(raw);
        setOhlcvData(norm);
      })
      .catch((err: Error & { response?: { data?: { msg?: string } } }) => {
        setOhlcvData([]);
        const msg = err?.response?.data?.msg ?? err?.message ?? 'No data found';
        setLoadError(typeof msg === 'string' ? msg : 'No data found');
      })
      .finally(() => setLoading(false));
  }, [market, symbol, timeframe]);

  useEffect(() => {
    if (!market || !symbol) {
      setOhlcvData([]);
      setLoading(false);
      setLoadError(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    fetchKline();
  }, [market, symbol, timeframe, fetchKline]);

  useEffect(() => {
    if (!realtimeUpdates || !market || !symbol) return;
    const t = setInterval(fetchKline, KLINE_REFRESH_MS);
    return () => clearInterval(t);
  }, [realtimeUpdates, market, symbol, timeframe, fetchKline]);

  useEffect(() => {
    if (!containerRef.current || loading || ohlcvData.length === 0) return;

    const chart = init(containerRef.current, {
      styles: {
        grid: {
          show: true,
          horizontal: { show: true, size: 1, color: 'rgba(255,255,255,0.05)', dashedValue: [] },
          vertical: { show: true, size: 1, color: 'rgba(255,255,255,0.05)', dashedValue: [] },
        },
        candle: {
          type: CandleType.CandleSolid,
          bar: {
            upColor: '#10b981',
            downColor: '#f43f5e',
            upBorderColor: '#10b981',
            downBorderColor: '#f43f5e',
            upWickColor: '#10b981',
            downWickColor: '#f43f5e',
          },
        },
      },
    });
    if (!chart) return;
    chartRef.current = chart;

    const klineData = toKLineData(ohlcvData);
    chart.applyNewData(klineData);

    const crosshairCb = (data: { kLineData?: KLineData }) => {
      const k = data?.kLineData;
      if (!k) {
        onOhlcvHover(null);
        return;
      }
      const candle = ohlcvRef.current.find((c) => {
        const ct = c.time >= 1e12 ? c.time : c.time * 1000;
        return Math.abs(ct - k.timestamp) < 60000;
      });
      onOhlcvHover(candle ?? null);
    };
    chart.subscribeAction(ActionType.OnCrosshairChange, crosshairCb);

    const handleResize = () => {
      if (chartRef.current) {
        try {
          chartRef.current.resize();
        } catch {}
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        chart.unsubscribeAction(ActionType.OnCrosshairChange, crosshairCb);
      } catch {}
      try {
        if (containerRef.current) dispose(containerRef.current);
      } catch {}
      chartRef.current = null;
      indicatorPaneIdsRef.current.clear();
    };
  }, [loading, ohlcvData.length, onOhlcvHover]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || ohlcvData.length === 0) return;

    const klineData = toKLineData(ohlcvData);
    chart.applyNewData(klineData);
  }, [ohlcvData]);

  // When user selects a drawing tool, create the overlay so they can draw on the chart
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !drawingTool) return;
    const overlayName = DRAWING_TOOL_TO_OVERLAY[drawingTool];
    if (!overlayName) return;
    try {
      chart.createOverlay(overlayName);
    } catch {
      // Overlay type may not exist in this version
    }
  }, [drawingTool]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const prev = indicatorPaneIdsRef.current;
    prev.forEach((paneId) => {
      try {
        chart.removeIndicator(paneId);
      } catch {}
    });
    prev.clear();

    const overlayNames = ['SMA', 'EMA', 'BB'] as const;
    overlayNames.forEach((name) => {
      if (!activeIndicators.has(name)) return;
      const klcName = OUR_TO_KLC[name] ?? name;
      try {
        const paneId = chart.createIndicator(klcName, true);
        if (paneId) prev.set(name, paneId);
      } catch {
        // built-in may not exist for this name
      }
    });

    const subNames = ['RSI', 'MACD', 'ATR', 'CCI', 'W%R', 'KDJ', 'OBV', 'ADX', 'MFI', 'ADOSC', 'AD'] as const;
    subNames.forEach((name) => {
      if (!activeIndicators.has(name)) return;
      const klcName = OUR_TO_KLC[name] ?? name;
      try {
        const paneId = chart.createIndicator(klcName, false);
        if (paneId) prev.set(name, paneId);
      } catch {
        // skip if not supported
      }
    });
  }, [activeIndicators]);

  useEffect(() => {
    if (!onIndicatorLegend || ohlcvData.length === 0) return;
    const entries: IndicatorLegendEntry[] = [];
    if (activeIndicators.has('SMA')) {
      const v = sma(ohlcvData, 20);
      const last = v.filter((n) => !Number.isNaN(n)).pop();
      if (last != null) entries.push({ name: 'SMA(20)', value: last });
    }
    if (activeIndicators.has('EMA')) {
      const v = ema(ohlcvData, 20);
      const last = v.filter((n) => !Number.isNaN(n)).pop();
      if (last != null) entries.push({ name: 'EMA(20)', value: last });
    }
    if (activeIndicators.has('BB')) {
      const { middle } = bbands(ohlcvData, 20, 2);
      const last = middle.filter((n) => !Number.isNaN(n)).pop();
      if (last != null) entries.push({ name: 'BB Middle(20)', value: last });
    }
    if (activeIndicators.has('RSI')) {
      const v = rsi(ohlcvData, 14);
      const last = v.filter((n) => !Number.isNaN(n)).pop();
      if (last != null) entries.push({ name: 'RSI(14)', value: last });
    }
    if (activeIndicators.has('MACD')) {
      const { macd: macdLine } = macd(ohlcvData, 12, 26, 9);
      const last = macdLine.filter((n) => n != null && !Number.isNaN(n)).pop();
      if (last != null) entries.push({ name: 'MACD DIF', value: last });
    }
    if (activeIndicators.has('ATR')) {
      const v = atr(ohlcvData, 14);
      const last = v.filter((n) => !Number.isNaN(n)).pop();
      if (last != null) entries.push({ name: 'ATR(14)', value: last });
    }
    onIndicatorLegend(entries);
  }, [ohlcvData, activeIndicators, onIndicatorLegend]);

  const handleRetry = () => {
    setLoadError(false);
    setLoading(true);
    getKlineData(market, symbol, timeframe, 300)
      .then((raw) => {
        const norm = normalizeKlines(raw);
        setOhlcvData(norm);
      })
      .catch((err: Error & { response?: { data?: { msg?: string } } }) => {
        const msg = err?.response?.data?.msg ?? err?.message ?? 'No data found';
        setLoadError(typeof msg === 'string' ? msg : 'No data found');
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 flex items-center justify-center" style={{ minHeight: CHART_HEIGHT }}>
        <p className="text-text-muted text-sm">Loading chart...</p>
      </div>
    );
  }
  if (loadError || ohlcvData.length === 0) {
    const message = typeof loadError === 'string' ? loadError : 'No data found';
    return (
      <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center gap-3" style={{ minHeight: CHART_HEIGHT }}>
        <p className="text-text-muted text-sm flex items-center gap-2">
          <span className="text-error">Failed to load data: {message}</span>
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="px-4 py-2 rounded-lg border border-accent-primary/40 text-accent-primary text-sm font-medium hover:bg-accent-primary/10"
        >
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-all duration-300 ease-in-out">
      <div ref={containerRef} className="w-full" style={{ height: CHART_HEIGHT }} />
    </div>
  );
}

/* ========== PREVIOUS lightweight-charts IMPLEMENTATION (uncomment and remove KLineCharts block above to revert) ==========
const MAIN_PANE = 0;
const SUB_PANE_ORDER = ['RSI', 'MACD', 'ATR'] as const;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const indicatorSeriesRefs = useRef<(ISeriesApi<'Line'> | ISeriesApi<'Histogram'>)[]>([]);
  const executedSeriesRefs = useRef<ISeriesApi<'Line'>[]>([]);

  useEffect(() => {
    if (!containerRef.current || loading || ohlcvData.length === 0) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
        panes: {
          separatorColor: 'rgba(255,255,255,0.08)',
          separatorHoverColor: 'rgba(255,255,255,0.15)',
          enableResize: true,
        },
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.05)' },
      },
      width: containerRef.current.clientWidth,
      height: CHART_HEIGHT,
      crosshair: { ... },
      rightPriceScale: { ... },
      timeScale: { ... },
      handleScroll: { ... },
      handleScale: { ... },
    });
    chartRef.current = chart;
    const candleSeries = chart.addSeries(CandlestickSeries, { ... });
    candleSeriesRef.current = candleSeries;
    const toT = (t: number): Time => ...;
    const chartData: CandlestickData[] = ohlcvData.map(...);
    candleSeries.setData(chartData);
    chart.timeScale().fitContent();
    chart.subscribeCrosshairMove((param) => { ... });
    window.addEventListener('resize', handleResize);
    return () => { ... removeSeries, remove, chartRef = null };
  }, [loading, ohlcvData.length, onOhlcvHover]);

  useEffect(() => { candleSeriesRef.current.setData(chartData); chartRef.current.timeScale().fitContent(); }, [ohlcvData]);

  useEffect(() => {
    indicatorSeriesRefs.current.forEach((s) => chart.removeSeries(s));
    indicatorSeriesRefs.current = [];
    // Main pane: SMA, EMA, BB (LineSeries)
    // Sub-panes: RSI, MACD (Line + Histogram), ATR (LineSeries)
    // panes stretchFactor, onIndicatorLegend(entries)
  }, [ohlcvData, activeIndicators, onIndicatorLegend]);

  useEffect(() => {
    executedSeriesRefs.current.forEach((s) => chart.removeSeries(s));
    executedSeriesRefs.current = [];
    (executedIndicatorOutput.plots ?? []).forEach((plot) => { ... addSeries LineSeries });
  }, [ohlcvData, executedIndicatorOutput]);
========== END lightweight-charts ========== */
