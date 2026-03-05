'use client';

/**
 * useKlineChart — KLineCharts init, dispose, setData, indicators, crosshair.
 * Used by ChartSection for the Indicator Analysis page.
 * Supports custom indicator overlay: backend plots (lines) + B/S signal markers.
 */

import { useEffect, useRef, useCallback } from 'react';
import { init, dispose, ActionType, CandleType, LineType, registerIndicator, getSupportedIndicators } from 'klinecharts';
import type { KLineData } from 'klinecharts';
type ChartInstance = ReturnType<typeof init>;

/** KLineCharts main candle pane id (for removing overlay indicators). */
const CANDLE_PANE_ID = 'candle_pane';

/** Custom strategy overlay indicator name (backend-computed lines). */
export const CUSTOM_STRATEGY_OVERLAY_NAME = 'CUSTOM_STRATEGY_OVERLAY';

/** Max overlay lines we support from backend (figures count). */
const MAX_CUSTOM_LINES = 8;

/** Module-level ref for custom indicator calc to read current plot data (one chart per page). */
const customPlotDataRef: { current: { name: string; data: number[]; color: string }[] } = { current: [] };

/** Register once: custom indicator that draws backend plot lines on the main pane. */
function ensureCustomStrategyIndicatorRegistered() {
  if (typeof window === 'undefined') return;
  try {
    if (getSupportedIndicators().includes(CUSTOM_STRATEGY_OVERLAY_NAME)) return;
  } catch {}
  registerIndicator({
    name: CUSTOM_STRATEGY_OVERLAY_NAME,
    shortName: 'Strategy',
    figures: Array.from({ length: MAX_CUSTOM_LINES }, (_, i) => ({
      key: `line${i}`,
      title: `L${i}: `,
      type: 'line',
    })),
    calc: (kLineDataList: KLineData[]) => {
      const lines = customPlotDataRef.current;
      if (!lines?.length) return kLineDataList.map(() => ({}));
      return kLineDataList.map((_, i) => {
        const r: Record<string, number | null> = {};
        lines.forEach((l, j) => {
          r[`line${j}`] = l.data[i] ?? null;
        });
        return r;
      });
    },
  });
}

/** Map our indicator names to KLineCharts built-in indicator ids. */
export const INDICATOR_TO_KLC: Record<string, string> = {
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

/** Spec order for sub-panes: Volume always first, then these when toggled on. */
export const INDICATOR_PANE_ORDER = [
  'RSI',
  'MACD',
  'ATR',
  'CCI',
  'W%R',
  'MFI',
  'ADX',
  'OBV',
  'ADOSC',
  'AD',
  'KDJ',
] as const;

const OVERLAY_INDICATORS = ['SMA', 'EMA', 'BB'] as const;

export interface UseKlineChartOptions {
  /** Dark & gold theme (MarketLabs) vs light theme */
  dark?: boolean;
  /** Chart height in px */
  height?: number;
}

/** Line overlay from backend indicator output (overlay: true). */
export interface CustomIndicatorLine {
  name: string;
  data: number[];
  color: string;
}

/** Single B/S marker position for simpleAnnotation overlay. */
export interface CustomSignalPoint {
  timestamp: number;
  value: number;
  type: 'B' | 'S';
}

/** Custom indicator overlay: backend plots (lines) + buy/sell signal markers. */
export interface CustomIndicatorOverlay {
  lines: CustomIndicatorLine[];
  signalPoints: CustomSignalPoint[];
}

export interface UseKlineChartResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Set full OHLCV data (call after fetch). */
  setData: (data: KLineData[]) => void;
  /** Set active indicator toggles; creates/removes panes in spec order. */
  setIndicators: (active: Set<string>) => void;
  /** Set custom strategy overlay (backend indicator lines + B/S markers). Pass null to clear. */
  setCustomIndicatorOverlay: (overlay: CustomIndicatorOverlay | null) => void;
  /** Update last candle (e.g. realtime). Append or replace last. */
  updateLastCandle: (candle: KLineData) => void;
  /** Subscribe to crosshair move for OHLCV bar. */
  onCrosshair: (cb: (data: KLineData | null) => void) => void;
  /** Create overlay for drawing tool (e.g. segment, priceLine). */
  setDrawingTool: (overlayType: string | null) => void;
  /** Remove overlay by id, or cancel current drawing when called with no args. */
  removeOverlay: (id?: string) => void;
}

/** Colors for B/S markers (match existing theme). */
const SIGNAL_B_COLOR = '#26A69A';
const SIGNAL_S_COLOR = '#EF5350';

export function useKlineChart(options: UseKlineChartOptions = {}): UseKlineChartResult {
  const { dark = true, height = 480 } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartInstance | null>(null);
  const paneIdsRef = useRef<Map<string, string>>(new Map());
  const crosshairCbRef = useRef<((data: KLineData | null) => void) | null>(null);
  const customSignalOverlayIdsRef = useRef<string[]>([]);
  const hasCustomStrategyOverlayRef = useRef(false);

  // Init chart on mount; dispose on unmount
  useEffect(() => {
    ensureCustomStrategyIndicatorRegistered();
    const el = containerRef.current;
    if (!el) return;

    const gridColor = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const axisColor = dark ? '#2A3040' : '#E5E7EB';
    const tickColor = dark ? '#6B7280' : '#6B7280';
    const crosshairColor = dark ? '#D4A843' : '#2DD4A8';

    const chart = init(el, {
      styles: {
        grid: {
          show: true,
          horizontal: { show: true, size: 1, color: gridColor, dashedValue: [] },
          vertical: { show: true, size: 1, color: gridColor, dashedValue: [] },
        },
        candle: {
          type: CandleType.CandleSolid,
          bar: {
            upColor: '#26A69A',
            downColor: '#EF5350',
            upBorderColor: '#26A69A',
            downBorderColor: '#EF5350',
            upWickColor: '#26A69A',
            downWickColor: '#EF5350',
          },
          priceMark: {
            show: true,
            last: {
              show: true,
              upColor: '#26A69A',
              downColor: '#EF5350',
              line: { show: true, dashedValue: [4, 4] },
            },
          },
        },
        indicator: {
          lastValueMark: { show: true },
        },
        xAxis: {
          axisLine: { color: axisColor },
          tickText: { color: tickColor },
        },
        yAxis: {
          axisLine: { color: axisColor },
          tickText: { color: tickColor },
        },
        crosshair: {
          show: true,
          horizontal: { line: { color: crosshairColor, dashedValue: [4, 4] } },
          vertical: { line: { color: crosshairColor, dashedValue: [4, 4] } },
        },
        separator: { color: axisColor },
      },
    });

    chartRef.current = chart;
    if (!chart) return;

    const crosshairCb = (data: { kLineData?: KLineData }) => {
      const k = data?.kLineData;
      crosshairCbRef.current?.(k ?? null);
    };
    chart.subscribeAction(ActionType.OnCrosshairChange, crosshairCb);

    const onResize = () => {
      try {
        chart.resize();
      } catch {}
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      try {
        chart.unsubscribeAction(ActionType.OnCrosshairChange, crosshairCb);
      } catch {}
      try {
        if (el) dispose(el);
      } catch {}
      chartRef.current = null;
      paneIdsRef.current.clear();
    };
  }, [dark]);

  const setData = useCallback((data: KLineData[]) => {
    const chart = chartRef.current;
    if (chart && data.length > 0) chart.applyNewData(data);
  }, []);

  const setIndicators = useCallback((active: Set<string>) => {
    const chart = chartRef.current;
    if (!chart) return;

    const prev = paneIdsRef.current;
    prev.forEach((paneId) => {
      try {
        chart.removeIndicator(paneId);
      } catch {}
    });
    prev.clear();

    // Overlays on main candle pane
    OVERLAY_INDICATORS.forEach((name) => {
      if (!active.has(name)) return;
      const klc = INDICATOR_TO_KLC[name] ?? name;
      try {
        const paneId = chart.createIndicator(klc, true);
        if (paneId) prev.set(name, paneId);
      } catch {}
    });

    // Minimum height per pane so many indicators stay readable (not squashed)
    const paneMinHeight = 80;

    // Volume pane always
    try {
      const volId = chart.createIndicator('VOL', false, { minHeight: paneMinHeight });
      if (volId) prev.set('VOL', volId);
    } catch {}

    // Sub-panes in spec order
    INDICATOR_PANE_ORDER.forEach((name) => {
      if (!active.has(name)) return;
      const klc = INDICATOR_TO_KLC[name] ?? name;
      try {
        const paneId = chart.createIndicator(klc, false, { minHeight: paneMinHeight });
        if (paneId) prev.set(name, paneId);
      } catch {}
    });
  }, []);

  const updateLastCandle = useCallback((candle: KLineData) => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      chart.updateData(candle);
    } catch {}
  }, []);

  const onCrosshair = useCallback((cb: (data: KLineData | null) => void) => {
    crosshairCbRef.current = cb;
  }, []);

  const setDrawingTool = useCallback((overlayType: string | null) => {
    const chart = chartRef.current;
    if (!chart) return;
    if (!overlayType) return;
    try {
      chart.createOverlay(overlayType);
    } catch {}
  }, []);

  /** Remove overlay by id, or call with no args to cancel current drawing. */
  const removeOverlay = useCallback((id?: string) => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      chart.removeOverlay(id ?? undefined);
    } catch {}
  }, []);

   /** Set custom strategy overlay (backend indicator lines + B/S markers). Clears previous. */
  const setCustomIndicatorOverlay = useCallback((overlay: CustomIndicatorOverlay | null) => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove previous signal overlays
    customSignalOverlayIdsRef.current.forEach((id) => {
      try {
        chart.removeOverlay(id);
      } catch {}
    });
    customSignalOverlayIdsRef.current = [];

    // Remove custom strategy line indicator from candle pane
    if (hasCustomStrategyOverlayRef.current) {
      try {
        chart.removeIndicator(CANDLE_PANE_ID, CUSTOM_STRATEGY_OVERLAY_NAME);
      } catch {}
      hasCustomStrategyOverlayRef.current = false;
    }

    if (!overlay) {
      customPlotDataRef.current = [];
      return;
    }

    // Create simpleAnnotation overlay for each B/S signal
    overlay.signalPoints.forEach((pt) => {
      try {
        const id = chart.createOverlay({
          name: 'simpleAnnotation',
          points: [{ timestamp: pt.timestamp, value: pt.value }],
          extendData: pt.type,
          lock: true,
          styles: {
            line: { style: LineType.Dashed },
            point: {
              color: pt.type === 'B' ? SIGNAL_B_COLOR : SIGNAL_S_COLOR,
              borderColor: pt.type === 'B' ? SIGNAL_B_COLOR : SIGNAL_S_COLOR,
              borderSize: 1,
              radius: 10,
            },
            text: {
              color: '#fff',
              size: 11,
              weight: 'bold',
            },
          },
        });
        if (typeof id === 'string') customSignalOverlayIdsRef.current.push(id);
      } catch {}
    });

    // Set plot data and create custom line indicator if we have overlay lines
    if (overlay.lines.length > 0) {
      customPlotDataRef.current = overlay.lines.slice(0, MAX_CUSTOM_LINES);
      try {
        chart.overrideIndicator({
          name: CUSTOM_STRATEGY_OVERLAY_NAME,
          styles: {
            lines: overlay.lines.slice(0, MAX_CUSTOM_LINES).map((l) => ({
              color: l.color,
              size: 1.5,
              style: LineType.Solid,
              smooth: false,
              dashedValue: [],
            })),
          },
        });
        chart.createIndicator(CUSTOM_STRATEGY_OVERLAY_NAME, true);
        hasCustomStrategyOverlayRef.current = true;
      } catch {}
    } else {
      customPlotDataRef.current = [];
    }
  }, []);

  return {
    containerRef,
    setData,
    setIndicators,
    setCustomIndicatorOverlay,
    updateLastCandle,
    onCrosshair,
    setDrawingTool,
    removeOverlay,
  };
}
