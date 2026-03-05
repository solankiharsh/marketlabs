'use client';

/**
 * Left vertical drawing toolbar for ChartSection.
 * Icons: horizontal line, trend line, measure, arrow, parallel, fib, price label, rect, freehand, vertical line, delete.
 * Active tool: gold (dark) or teal (light) background.
 */

import {
  Minus,
  TrendingUp,
  Ruler,
  ArrowRight,
  Copy,
  Layers,
  DollarSign,
  Square,
  Pencil,
  Trash2,
} from 'lucide-react';

/** Map our tool id to KLineCharts createOverlay type name (built-in overlay names only) */
export const DRAWING_TOOL_OVERLAY: Record<string, string> = {
  hline: 'horizontalStraightLine',
  trend: 'segment',
  measure: 'horizontalSegment',
  arrow: 'straightLine',
  parallel: 'parallelStraightLine',
  fib: 'fibonacciLine',
  label: 'priceLine',
  rect: 'simpleAnnotation',
  rect2: 'simpleTag',
  freehand: 'straightLine',
  vline: 'verticalSegment',
};

const TOOLS = [
  { id: 'hline', icon: Minus, label: 'Horizontal Line' },
  { id: 'trend', icon: TrendingUp, label: 'Trend Line' },
  { id: 'measure', icon: Ruler, label: 'Measure / Price Range' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'parallel', icon: Copy, label: 'Parallel Line' },
  { id: 'fib', icon: Layers, label: 'Fibonacci Retracement' },
  { id: 'label', icon: DollarSign, label: 'Price Label' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'rect2', icon: Square, label: 'Shape' },
  { id: 'freehand', icon: Pencil, label: 'Freehand Draw' },
  { id: 'vline', icon: Minus, label: 'Vertical Line' },
] as const;

export interface ChartToolbarProps {
  activeId: string | null;
  onToolSelect: (id: string | null) => void;
  /** Called when Delete is clicked (cancels current drawing; right-click a drawing to remove it). */
  onDeleteClick?: () => void;
  dark?: boolean;
}

export function ChartToolbar({ activeId, onToolSelect, onDeleteClick, dark = true }: ChartToolbarProps) {
  return (
    <div
      className="w-10 shrink-0 flex flex-col items-center py-2 border-r border-[#2A3040] rounded-l-lg bg-[#181C25]"
      role="toolbar"
      aria-label="Drawing tools"
    >
      {TOOLS.map(({ id, icon: Icon, label }) => {
        const isActive = activeId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToolSelect(isActive ? null : id)}
            title={label}
            className={`p-2 rounded-lg mb-0.5 transition-colors ${
              isActive
                ? dark
                  ? 'bg-[#D4A843] text-[#0F1117]'
                  : 'bg-[#2DD4A8] text-white'
                : 'text-[#6B7280] hover:bg-[#1E2330] hover:text-[#F5F5F5]'
            }`}
            aria-label={label}
            aria-pressed={isActive}
          >
            <Icon
              className="w-4 h-4"
              style={id === 'vline' ? { transform: 'rotate(90deg)' } : undefined}
            />
          </button>
        );
      })}
      <div className="flex-1 min-h-2" />
      <button
        type="button"
        onClick={onDeleteClick}
        className="p-2 rounded-lg text-[#6B7280] hover:bg-[#1E2330] hover:text-[#F5F5F5] mt-2"
        title="Cancel current drawing. Right-click a drawing on the chart to delete it."
        aria-label="Cancel drawing or delete selected"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
