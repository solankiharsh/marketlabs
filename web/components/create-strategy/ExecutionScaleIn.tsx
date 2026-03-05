'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';

interface ScaleInConfig {
  trendFollowing: boolean;
  trendTriggerPct: number;
  trendSizePct: number;
  maxTrendTimes: number;
  meanReversionDca: boolean;
  dcaTriggerPct: number;
  dcaSizePct: number;
  maxDcaTimes: number;
}

interface ExecutionScaleInProps {
  config: ScaleInConfig;
  onChange: (config: ScaleInConfig) => void;
  open: boolean;
  onToggle: () => void;
}

export function ExecutionScaleIn({ config, onChange, open, onToggle }: ExecutionScaleInProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-text-primary hover:bg-bg-elevated"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Execution: Scale-in (Trend / DCA)
      </button>
      {open && (
        <div className="p-3 pt-0 space-y-3 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm mb-2">Trend-following scale-in</label>
              <input
                type="checkbox"
                checked={config.trendFollowing}
                onChange={(e) => onChange({ ...config, trendFollowing: e.target.checked })}
                className="rounded border-border"
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs text-text-muted">Trigger (%)</label>
                  <input
                    type="number"
                    step={0.0001}
                    value={config.trendTriggerPct}
                    onChange={(e) => onChange({ ...config, trendTriggerPct: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Size (% capital)</label>
                  <input
                    type="number"
                    step={0.0001}
                    value={config.trendSizePct}
                    onChange={(e) => onChange({ ...config, trendSizePct: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Max times</label>
                  <input
                    type="number"
                    min={0}
                    value={config.maxTrendTimes}
                    onChange={(e) => onChange({ ...config, maxTrendTimes: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm mb-2">Mean-reversion DCA</label>
              <input
                type="checkbox"
                checked={config.meanReversionDca}
                onChange={(e) => onChange({ ...config, meanReversionDca: e.target.checked })}
                className="rounded border-border"
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs text-text-muted">DCA trigger (%)</label>
                  <input
                    type="number"
                    step={0.0001}
                    value={config.dcaTriggerPct}
                    onChange={(e) => onChange({ ...config, dcaTriggerPct: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted">DCA size (%)</label>
                  <input
                    type="number"
                    step={0.0001}
                    value={config.dcaSizePct}
                    onChange={(e) => onChange({ ...config, dcaSizePct: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Max DCA times</label>
                  <input
                    type="number"
                    min={0}
                    value={config.maxDcaTimes}
                    onChange={(e) => onChange({ ...config, maxDcaTimes: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
