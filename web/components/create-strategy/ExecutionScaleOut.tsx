'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';

interface ScaleOutConfig {
  trendReduce: boolean;
  trendTriggerPct: number;
  reduceSizePct: number;
  maxTrendReduceTimes: number;
  adverseReduce: boolean;
  adverseTriggerPct: number;
  adverseReduceSizePct: number;
  maxAdverseReduceTimes: number;
}

interface ExecutionScaleOutProps {
  config: ScaleOutConfig;
  onChange: (config: ScaleOutConfig) => void;
  open: boolean;
  onToggle: () => void;
}

export function ExecutionScaleOut({ config, onChange, open, onToggle }: ExecutionScaleOutProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-text-primary hover:bg-bg-elevated"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Execution: Scale-out (Trend / Adverse)
      </button>
      {open && (
        <div className="p-3 pt-0 space-y-3 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm mb-2">Trend reduce</label>
              <input
                type="checkbox"
                checked={config.trendReduce}
                onChange={(e) => onChange({ ...config, trendReduce: e.target.checked })}
                className="rounded border-border"
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs text-text-muted">Trend trigger (%)</label>
                  <input
                    type="number"
                    step={0.0001}
                    value={config.trendTriggerPct}
                    onChange={(e) => onChange({ ...config, trendTriggerPct: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Reduce size (%)</label>
                  <input
                    type="number"
                    step={0.0001}
                    value={config.reduceSizePct}
                    onChange={(e) => onChange({ ...config, reduceSizePct: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Max trend reduce times</label>
                  <input
                    type="number"
                    min={0}
                    value={config.maxTrendReduceTimes}
                    onChange={(e) => onChange({ ...config, maxTrendReduceTimes: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm mb-2">Adverse reduce</label>
              <input
                type="checkbox"
                checked={config.adverseReduce}
                onChange={(e) => onChange({ ...config, adverseReduce: e.target.checked })}
                className="rounded border-border"
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs text-text-muted">Adverse trigger (%)</label>
                  <input
                    type="number"
                    step={0.0001}
                    value={config.adverseTriggerPct}
                    onChange={(e) => onChange({ ...config, adverseTriggerPct: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Adverse reduce size (%)</label>
                  <input
                    type="number"
                    step={0.0001}
                    value={config.adverseReduceSizePct}
                    onChange={(e) => onChange({ ...config, adverseReduceSizePct: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Max adverse reduce times</label>
                  <input
                    type="number"
                    min={0}
                    value={config.maxAdverseReduceTimes}
                    onChange={(e) => onChange({ ...config, maxAdverseReduceTimes: Number(e.target.value) || 0 })}
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
