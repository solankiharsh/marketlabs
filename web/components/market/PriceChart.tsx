'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, LineData, Time, IPriceLine } from 'lightweight-charts';
import { MarketScan, getOHLCVData, OHLCVCandle, getSupportResistance, SupportResistanceLevel } from '@/lib/api';

interface PriceChartProps {
  symbol: string;
  scans: MarketScan[];
  height?: number;
  showSupportResistance?: boolean;
}

export function PriceChart({ symbol, scans, height = 500, showSupportResistance = true }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d' | '1w'>('1d');
  const [ohlcvData, setOhlcvData] = useState<OHLCVCandle[]>([]);
  const [srLevels, setSrLevels] = useState<SupportResistanceLevel[]>([]);
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

  // Helper to convert Decimal/string/number to number
  const toNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'object' && 'toString' in value) {
      const num = parseFloat(value.toString());
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Chart colors - dark theme
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
    support: '#10b981',
    resistance: '#f43f5e',
  };

  // Fetch OHLCV data based on timeframe
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Map timeframe to granularity (seconds)
        const granularityMap: Record<'1h' | '4h' | '1d' | '1w', number> = {
          '1h': 60,      // 1-minute candles
          '4h': 240,     // 4-minute candles
          '1d': 86400,   // Daily candles
          '1w': 604800,  // Weekly candles
        };

        const count = timeframe === '1w' ? 50 : 100;
        const granularity = granularityMap[timeframe];
        
        const [ohlcv, sr] = await Promise.all([
          getOHLCVData(symbol, count, granularity).catch((err) => {
            console.error('[PriceChart] Error fetching OHLCV data:', err);
            // Return empty array on error instead of throwing
            return [];
          }),
          showSupportResistance ? getSupportResistance(symbol).catch(() => []) : Promise.resolve([]),
        ]);
        
        if (ohlcv.length === 0) {
          console.warn(`[PriceChart] No OHLCV data received for ${symbol} with timeframe ${timeframe}`);
        }
        
        setOhlcvData(ohlcv);
        setSrLevels(sr);
      } catch (error) {
        console.error('[PriceChart] Error fetching data:', error);
        setOhlcvData([]);
        setSrLevels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, timeframe, showSupportResistance]);

  // Initialize chart - only when container is ready, not loading, and we have data
  useEffect(() => {
    if (!chartContainerRef.current || loading || ohlcvData.length === 0) return;

    // Clean up existing chart and series before creating new one
    if (chartRef.current) {
      try {
        // Remove all series first
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
        // Clear price lines
        priceLinesRef.current = [];
        // Remove chart
        chartRef.current.remove();
      } catch (error) {
        console.warn('[PriceChart] Error cleaning up chart:', error);
      }
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
      height: height,
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
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        minimumWidth: 70,
        autoScale: true,
      },
      leftPriceScale: {
        visible: false,
      },
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
      handleScroll: {
        vertTouchDrag: true,
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderUpColor: colors.borderUp,
      borderDownColor: colors.borderDown,
      wickUpColor: colors.wickUp,
      wickDownColor: colors.wickDown,
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Add crosshair move handler for tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData || !candlestickSeriesRef.current || !param.point) {
        setTooltipData(null);
        return;
      }

      const data = param.seriesData.get(candlestickSeriesRef.current) as CandlestickData | undefined;
      
      if (data && data.open !== undefined && data.high !== undefined && 
          data.low !== undefined && data.close !== undefined && chartContainerRef.current) {
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

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        try {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        } catch (error) {
          // Chart might be disposed, ignore
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      // Clean up chart
      if (chartRef.current) {
        try {
          // Remove all series first
          if (candlestickSeriesRef.current) {
            try {
              chartRef.current.removeSeries(candlestickSeriesRef.current);
            } catch {}
          }
          if (sma20SeriesRef.current) {
            try {
              chartRef.current.removeSeries(sma20SeriesRef.current);
            } catch {}
          }
          if (ema50SeriesRef.current) {
            try {
              chartRef.current.removeSeries(ema50SeriesRef.current);
            } catch {}
          }
          priceLinesRef.current = [];
          chartRef.current.remove();
        } catch (error) {
          // Chart already disposed, ignore
        }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      sma20SeriesRef.current = null;
      ema50SeriesRef.current = null;
      }
    };
  }, [height, colors, timeframe, loading, ohlcvData.length]);

  // Update chart data
  useEffect(() => {
    if (!candlestickSeriesRef.current || !ohlcvData || ohlcvData.length === 0) return;
    if (!chartRef.current) return; // Chart not initialized yet

    try {
      const chartData: CandlestickData[] = ohlcvData.map(c => ({
        time: Math.floor(c.time / 1000) as Time, // Convert to seconds
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      candlestickSeriesRef.current.setData(chartData);

      // Fit content
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (error) {
      console.warn('[PriceChart] Error updating chart data:', error);
    }
  }, [ohlcvData]);

  // Calculate SMA and EMA from OHLCV data
  const calculateSMA = (data: OHLCVCandle[], period: number): number[] => {
    const sma: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, c) => acc + c.close, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  };

  const calculateEMA = (data: OHLCVCandle[], period: number): number[] => {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA value is SMA
    if (data.length >= period) {
      const firstSMA = data.slice(0, period).reduce((acc, c) => acc + c.close, 0) / period;
      ema.push(firstSMA);
      
      // Calculate subsequent EMA values
      for (let i = period; i < data.length; i++) {
        const prevEMA = ema[ema.length - 1];
        const currentClose = data[i].close;
        const newEMA = (currentClose - prevEMA) * multiplier + prevEMA;
        ema.push(newEMA);
      }
    }
    
    // Pad with NaN for initial values
    const padded = new Array(data.length - ema.length).fill(NaN);
    return [...padded, ...ema];
  };

  // Add indicators (SMA20, EMA50) calculated from OHLCV data
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || !ohlcvData || ohlcvData.length === 0) return;

    try {
      const chart = chartRef.current;

      // Clean up existing series
      if (sma20SeriesRef.current) {
        try {
          chart.removeSeries(sma20SeriesRef.current);
        } catch {}
        sma20SeriesRef.current = null;
      }
      if (ema50SeriesRef.current) {
        try {
          chart.removeSeries(ema50SeriesRef.current);
        } catch {}
        ema50SeriesRef.current = null;
      }

      // Calculate indicators
      const sma20Values = calculateSMA(ohlcvData, 20);
      const ema50Values = calculateEMA(ohlcvData, 50);

      // Add SMA20 line
      if (sma20Values.some(v => !isNaN(v))) {
        const sma20Data: LineData[] = ohlcvData
          .map((c, i) => ({
            time: Math.floor(c.time / 1000) as Time,
            value: sma20Values[i],
          }))
          .filter(d => !isNaN(d.value));
        
        if (sma20Data.length > 0) {
          const sma20Series = chart.addSeries(LineSeries, {
            color: colors.sma20,
            lineWidth: 1,
            title: 'SMA 20',
            priceLineVisible: false,
            lastValueVisible: false,
          });
          sma20Series.setData(sma20Data);
          sma20SeriesRef.current = sma20Series;
        }
      }

      // Add EMA50 line
      if (ema50Values.some(v => !isNaN(v))) {
        const ema50Data: LineData[] = ohlcvData
          .map((c, i) => ({
            time: Math.floor(c.time / 1000) as Time,
            value: ema50Values[i],
          }))
          .filter(d => !isNaN(d.value));
        
        if (ema50Data.length > 0) {
          const ema50Series = chart.addSeries(LineSeries, {
            color: colors.ema50,
            lineWidth: 1,
            title: 'EMA 50',
            priceLineVisible: false,
            lastValueVisible: false,
          });
          ema50Series.setData(ema50Data);
          ema50SeriesRef.current = ema50Series;
        }
      }
    } catch (error) {
      console.warn('[PriceChart] Error updating indicators:', error);
    }
  }, [ohlcvData, colors]);

  // Add support/resistance levels
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || !srLevels || srLevels.length === 0) return;

    try {
      // Remove existing price lines
      priceLinesRef.current.forEach(line => {
        try {
          candlestickSeriesRef.current?.removePriceLine(line);
        } catch {}
      });
      priceLinesRef.current = [];

      // Add new price lines
      srLevels.forEach(level => {
        const levelValue = toNumber(level.level);
        if (levelValue > 0 && candlestickSeriesRef.current) {
          const priceLine = candlestickSeriesRef.current.createPriceLine({
            price: levelValue,
            color: level.type === 'support' ? colors.support : colors.resistance,
            lineWidth: 1,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: `${level.type === 'support' ? 'Support' : 'Resistance'} (${level.strength} touch${level.strength !== 1 ? 'es' : ''})`,
          });
          priceLinesRef.current.push(priceLine);
        }
      });
    } catch (error) {
      console.warn('[PriceChart] Error updating support/resistance levels:', error);
    }
  }, [srLevels, colors]);

  if (scans.length === 0 && !loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6" style={{ minHeight: height }}>
        <div className="flex items-center justify-center h-full text-text-muted">
          No price data available
        </div>
      </div>
    );
  }

  // Find latest scan (handle both with and without asset relation)
  const latestScan = scans.find(s => s.asset?.symbol === symbol) || scans[0];
  const currentPrice = toNumber(latestScan?.price);
  const change24h = toNumber(latestScan?.change24h);

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-semibold">{latestScan?.asset?.displayName || latestScan?.asset?.symbol || symbol}</h3>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold">{currentPrice.toFixed(4)}</span>
            <span className={`text-base sm:text-lg font-semibold ${change24h >= 0 ? 'text-success' : 'text-error'}`}>
              {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['1h', '4h', '1d', '1w'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
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

      {/* Tooltip */}
      {tooltipData && (
        <div
          className="absolute bg-bg-primary border border-border rounded-lg p-2 text-xs z-10 pointer-events-none"
          style={{
            left: `${tooltipData.x}px`,
            top: `${tooltipData.y}px`,
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

      {/* Chart container */}
      <div className="relative w-full" style={{ height, minHeight: height }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-text-muted text-sm sm:text-base">Loading chart data...</div>
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-full" />
        )}
      </div>

      {/* Legend */}
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
          {srLevels.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 border-t border-dashed" style={{ borderColor: colors.support }} />
                <span>Support</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 border-t border-dashed" style={{ borderColor: colors.resistance }} />
                <span>Resistance</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
