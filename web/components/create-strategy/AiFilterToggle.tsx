'use client';

import { Bot } from 'lucide-react';

interface AiFilterToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function AiFilterToggle({ enabled, onChange }: AiFilterToggleProps) {
  return (
    <div className="rounded-lg border border-border p-3 flex items-start gap-3">
      <Bot className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-text-primary">
            Enable AI Intelligent Decision Filter
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 rounded-full bg-bg-elevated border border-border peer-checked:bg-accent-primary/30 peer-checked:border-accent-primary/50 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-text-muted after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-accent-primary" />
          </label>
        </div>
        <p className="text-xs text-text-muted mt-1">
          When enabled, indicator signals will be filtered by AI to improve trading quality.
        </p>
      </div>
    </div>
  );
}
