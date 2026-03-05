'use client';

import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export interface EChartsLineSeries {
  name: string;
  dataKey: string;
  color?: string;
  type?: 'line' | 'area';
}

export interface EChartsLineProps {
  /** Chart data array (e.g. [{ date: '2024-01-01', profit: 100 }, ...]) */
  data: Record<string, string | number>[];
  /** Series config: which keys to plot */
  series: EChartsLineSeries[];
  /** Key used for X axis (e.g. 'date', 'time') */
  xAxisKey?: string;
  /** Chart height in px or CSS value */
  height?: number | string;
  /** Optional ECharts theme (e.g. 'dark') */
  theme?: 'light' | 'dark';
  /** Show area fill under line */
  smooth?: boolean;
  className?: string;
}

/**
 * Line/area chart using Apache ECharts (https://echarts.apache.org/examples/en/index.html#chart-type-line).
 * Use for time-series: PnL, equity curve, etc.
 */
export function EChartsLine({
  data,
  series,
  xAxisKey = 'date',
  height = 256,
  theme = 'dark',
  smooth = true,
  className,
}: EChartsLineProps) {
  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: 'var(--card, #1f2937)',
      borderColor: 'var(--border, #374151)',
      textStyle: { color: 'var(--text-primary, #f3f4f6)' },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map((d) => String(d[xAxisKey] ?? '')),
      axisLine: { lineStyle: { color: 'var(--border, #374151)' } },
      axisLabel: { color: 'var(--text-muted, #9ca3af)', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'var(--border, #374151)', type: 'dashed' } },
      axisLine: { show: false },
      axisLabel: { color: 'var(--text-muted, #9ca3af)', fontSize: 11 },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth,
      data: data.map((d) => (typeof d[s.dataKey] === 'number' ? d[s.dataKey] : Number(d[s.dataKey]) || 0)),
      lineStyle: { color: s.color ?? 'var(--accent-primary, #6366f1)' },
      areaStyle: s.type === 'area' ? { opacity: 0.2, color: s.color ?? 'var(--accent-primary, #6366f1)' } : undefined,
      symbol: 'none',
      emphasis: { focus: 'series' },
    })),
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}
      theme={theme}
      className={className}
      notMerge
      lazyUpdate
    />
  );
}
