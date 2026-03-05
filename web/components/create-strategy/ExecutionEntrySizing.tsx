'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';

interface EntrySizingConfig {
  entrySizePct: number;
}

interface ExecutionEntrySizingProps {
  config: EntrySizingConfig;
  onChange: (config: EntrySizingConfig) => void;
  open: boolean;
  onToggle: () => void;
}

export function ExecutionEntrySizing({ config, onChange, open, onToggle }: ExecutionEntrySizingProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-text-primary hover:bg-bg-elevated"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Execution: Entry sizing
      </button>
      {open && (
        <div className="p-3 pt-0 border-t border-border">
          <div>
            <label className="block text-xs text-text-muted mb-1">Entry size (% of capital)</label>
            <input
              type="number"
              step={0.01}
              min={0}
              max={100}
              value={config.entrySizePct}
              onChange={(e) => onChange({ entrySizePct: Number(e.target.value) || 0 })}
              className="w-full px-2 py-1.5 rounded border border-border bg-bg-secondary text-text-primary text-sm"
            />
            <p className="text-xs text-text-muted mt-1">
              Max entry: 100% (reserve budget for future scale-ins)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
