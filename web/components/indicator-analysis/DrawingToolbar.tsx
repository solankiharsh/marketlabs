'use client';

import { useState } from 'react';
import {
  Minus,
  TrendingUp,
  Ruler,
  ArrowRight,
  Copy,
  Layers,
  Square,
  Pencil,
  Trash2,
} from 'lucide-react';

const TOOLS = [
  { id: 'hline', icon: Minus, label: 'Horizontal Line' },
  { id: 'trend', icon: TrendingUp, label: 'Trend Line' },
  { id: 'measure', icon: Ruler, label: 'Measure Tool' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'parallel', icon: Copy, label: 'Parallel Line' },
  { id: 'fib', icon: Layers, label: 'Fibonacci Retracement' },
  { id: 'label', icon: Square, label: 'Price Label' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'freehand', icon: Pencil, label: 'Freehand Draw' },
  { id: 'vline', icon: Minus, label: 'Vertical Line' },
] as const;

interface DrawingToolbarProps {
  onToolSelect?: (id: string) => void;
}

export function DrawingToolbar({ onToolSelect }: DrawingToolbarProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleClick = (id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
    onToolSelect?.(id);
  };

  return (
    <div className="w-10 shrink-0 flex flex-col items-center py-2 border-r border-border bg-card/80 rounded-l-lg">
      {TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleClick(id)}
          title={label}
          className={`p-2 rounded mb-0.5 transition-colors ${
            activeId === id ? 'bg-accent-primary/20 text-accent-primary' : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'
          }`}
          aria-label={label}
        >
          <Icon className="w-4 h-4" style={id === 'vline' ? { transform: 'rotate(90deg)' } : undefined} />
        </button>
      ))}
      <div className="flex-1 min-h-2" />
      <button
        type="button"
        className="p-2 rounded text-text-muted hover:bg-bg-elevated hover:text-text-primary mt-2"
        title="Delete Selected Drawing"
        aria-label="Delete selected drawing"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
