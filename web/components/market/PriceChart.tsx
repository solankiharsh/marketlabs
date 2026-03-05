'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, LineData, Time } from 'lightweight-charts';
import { getKlineData, normalizeKlines, type OHLCVCandle } from '@/lib/api';

interface PriceChartProps {
  market: string;
  symbol: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  height?: number;
  displayName?: string;
}

const TIMEFRAME_OPTIONS = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'];

export function PriceChart({
  market,
  symbol,
  timeframe,
  onTimeframeChange,
  height = 500,
  displayName,
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [ohlcvData, setOhlcvData] = useState<OHLCVCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltipData, setTooltipData] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    x: number;
    y: number;
  } | null>(null);

  const colors = {
    background: 'transparent',
    text: '#9ca3af',
    grid: 'rgba(255, 255, 255, 0.05)',
    upColor: '#10b981',
    downColor: '#f43f5e',
    borderUp: '#10b981',
    borderDown: '#f43f5e',
    wickUp: '#10b981',
    wickDown: '#f43f5e',
    sma20: '#06b6d4',
    ema50: '#f59e0b',
  };

  useEffect(() => {
    if (!market || !symbol) {
      setOhlcvData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getKlineData(market, symbol, timeframe, 300)
      .then((raw) => {
        const normalized = normalizeKlines(raw);
        setOhlcvData(normalized);
      })
      .catch(() => setOhlcvData([]))
      .finally(() => setLoading(false));
  }, [market, symbol, timeframe]);

  useEffect(() => {
    if (!chartContainerRef.current || loading || ohlcvData.length === 0) return;

    if (chartRef.current) {
      try {
        if (candlestickSeriesRef.current) {
          try {
            chartRef.current.removeSeries(candlestickSeriesRef.current);
          } catch {}
          candlestickSeriesRef.current = null;
        }
        if (sma20SeriesRef.current) {
          try {
            chartRef.current.removeSeries(sma20SeriesRef.current);
          } catch {}
          sma20SeriesRef.current = null;
        }
        if (ema50SeriesRef.current) {
          try {
            chartRef.current.removeSeries(ema50SeriesRef.current);
          } catch {}
          ema50SeriesRef.current = null;
        }
        chartRef.current.remove();
      } catch {}
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.1)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1f2937',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.1)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1f2937',
        },
      },
      rightPriceScale: {
        borderColor: colors.grid,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        minimumWidth: 70,
        autoScale: true,
      },
      leftPriceScale: { visible: false },
      timeScale: {
        borderColor: colors.grid,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
        minBarSpacing: 4,
        fixLeftEdge: true,
        fixRightEdge: false,
      },
      handleScroll: { vertTouchDrag: true, mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderUpColor: colors.borderUp,
      borderDownColor: colors.borderDown,
      wickUpColor: colors.wickUp,
      wickDownColor: colors.wickDown,
    });
    candlestickSeriesRef.current = candlestickSeries;

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData || !candlestickSeriesRef.current || !param.point) {
        setTooltipData(null);
        return;
      }
      const data = param.seriesData.get(candlestickSeriesRef.current) as CandlestickData | undefined;
      if (data && typeof data.open === 'number' && typeof data.close === 'number') {
        setTooltipData({
          time: new Date((param.time as number) * 1000).toLocaleString(),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          x: param.point.x,
          y: param.point.y,
        });
      } else {
        setTooltipData(null);
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        try {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        } catch {}
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        try {
          if (candlestickSeriesRef.current) chartRef.current.removeSeries(candlestickSeriesRef.current);
          if (sma20SeriesRef.current) chartRef.current.removeSeries(sma20SeriesRef.current);
          if (ema50SeriesRef.current) chartRef.current.removeSeries(ema50SeriesRef.current);
          chartRef.current.remove();
        } catch {}
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      sma20SeriesRef.current = null;
      ema50SeriesRef.current = null;
    };
  }, [height, colors, timeframe, loading, ohlcvData.length]);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !ohlcvData.length || !chartRef.current) return;
    try {
      const toChartTime = (t: number) => (t >= 1e12 ? Math.floor(t / 1000) : t) as Time;
      const chartData: CandlestickData[] = ohlcvData.map((c) => ({
        time: toChartTime(c.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      candlestickSeriesRef.current.setData(chartData);
      chartRef.current.timeScale().fitContent();
    } catch {}
  }, [ohlcvData]);

  const calculateSMA = (data: OHLCVCandle[], period: number): number[] => {
    const sma: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) sma.push(NaN);
      else {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, c) => acc + c.close, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  };

  const calculateEMA = (data: OHLCVCandle[], period: number): number[] => {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    if (data.length >= period) {
      const firstSMA = data.slice(0, period).reduce((acc, c) => acc + c.close, 0) / period;
      ema.push(firstSMA);
      for (let i = period; i < data.length; i++) {
        const prevEMA = ema[ema.length - 1];
        const newEMA = (data[i].close - prevEMA) * multiplier + prevEMA;
        ema.push(newEMA);
      }
    }
    const padded = new Array(data.length - ema.length).fill(NaN);
    return [...padded, ...ema];
  };

  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || !ohlcvData.length) return;
    try {
      const chart = chartRef.current;
      if (sma20SeriesRef.current) {
        try { chart.removeSeries(sma20SeriesRef.current); } catch {}
        sma20SeriesRef.current = null;
      }
      if (ema50SeriesRef.current) {
        try { chart.removeSeries(ema50SeriesRef.current); } catch {}
        ema50SeriesRef.current = null;
      }

      const sma20Values = calculateSMA(ohlcvData, 20);
      const ema50Values = calculateEMA(ohlcvData, 50);
      const toT = (t: number) => (t >= 1e12 ? Math.floor(t / 1000) : t) as Time;

      if (sma20Values.some((v) => !isNaN(v))) {
        const sma20Data: LineData[] = ohlcvData
          .map((c, i) => ({ time: toT(c.time), value: sma20Values[i] }))
          .filter((d) => !isNaN(d.value));
        if (sma20Data.length > 0) {
          const s = chart.addSeries(LineSeries, {
            color: colors.sma20,
            lineWidth: 1,
            title: 'SMA 20',
            priceLineVisible: false,
            lastValueVisible: false,
          });
          s.setData(sma20Data);
          sma20SeriesRef.current = s;
        }
      }
      if (ema50Values.some((v) => !isNaN(v))) {
        const ema50Data: LineData[] = ohlcvData
          .map((c, i) => ({ time: toT(c.time), value: ema50Values[i] }))
          .filter((d) => !isNaN(d.value));
        if (ema50Data.length > 0) {
          const s = chart.addSeries(LineSeries, {
            color: colors.ema50,
            lineWidth: 1,
            title: 'EMA 50',
            priceLineVisible: false,
            lastValueVisible: false,
          });
          s.setData(ema50Data);
          ema50SeriesRef.current = s;
        }
      }
    } catch {}
  }, [ohlcvData, colors]);

  const currentPrice = ohlcvData.length > 0 ? ohlcvData[ohlcvData.length - 1].close : 0;
  const prevClose = ohlcvData.length > 1 ? ohlcvData[ohlcvData.length - 2].close : currentPrice;
  const changePct = prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-semibold">{displayName || symbol}</h3>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold">{currentPrice.toFixed(4)}</span>
            <span className={`text-base sm:text-lg font-semibold ${changePct >= 0 ? 'text-success' : 'text-error'}`}>
              {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {TIMEFRAME_OPTIONS.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors ${
                timeframe === tf
                  ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                  : 'bg-white/[0.03] text-text-muted hover:text-text-secondary hover:bg-white/[0.05]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {tooltipData && (
        <div
          className="absolute bg-bg-primary border border-border rounded-lg p-2 text-xs z-10 pointer-events-none"
          style={{
            left: tooltipData.x,
            top: tooltipData.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold mb-1">{tooltipData.time}</div>
          <div className="space-y-0.5">
            <div>O: {tooltipData.open.toFixed(4)}</div>
            <div>H: {tooltipData.high.toFixed(4)}</div>
            <div>L: {tooltipData.low.toFixed(4)}</div>
            <div>C: {tooltipData.close.toFixed(4)}</div>
          </div>
        </div>
      )}

      <div className="relative w-full" style={{ height, minHeight: height }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">Loading chart...</div>
        ) : ohlcvData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">No kline data</div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-full" />
        )}
      </div>

      {!loading && ohlcvData.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.sma20 }} />
            <span>SMA 20</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.ema50 }} />
            <span>EMA 50</span>
          </div>
        </div>
      )}
    </div>
  );
}
