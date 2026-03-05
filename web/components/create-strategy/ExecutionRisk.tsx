'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';

interface RiskConfig {
  stopLossPct: number;
  takeProfitPct: number;
  trailingStop: boolean;
  trailingTriggerPct: number;
  trailingDistancePct: number;
}

interface ExecutionRiskProps {
  risk: RiskConfig;
  onChange: (risk: RiskConfig) => void;
  open: boolean;
  onToggle: () => void;
}

export function ExecutionRisk({ risk, onChange, open, onToggle }: ExecutionRiskProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-text-primary hover:bg-bg-elevated"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Execution: Risk (SL / trailing)
      </button>
      {open && (
        <div className="p-3 pt-0 space-y-3 border-t border-border">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Stop Loss (%)</label>
              <input
                type="number"
                step={0.0001}
                value={risk.stopLossPct}
                onChange={(e) => onChange({ ...risk, stopLossPct: Number(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 rounded border border-border bg-bg-secondary text-text-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Take Profit (%)</label>
              <input
                type="number"
                step={0.0001}
                value={risk.takeProfitPct}
                onChange={(e) => onChange({ ...risk, takeProfitPct: Number(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 rounded border border-border bg-bg-secondary text-text-primary text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={risk.trailingStop}
              onChange={(e) => onChange({ ...risk, trailingStop: e.target.checked })}
              className="rounded border-border"
            />
            Trailing stop / take profit
          </label>
          {risk.trailingStop && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Trailing Trigger (%)</label>
                <input
                  type="number"
                  step={0.0001}
                  value={risk.trailingTriggerPct}
                  onChange={(e) => onChange({ ...risk, trailingTriggerPct: Number(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Trailing Distance (%)</label>
                <input
                  type="number"
                  step={0.0001}
                  value={risk.trailingDistancePct}
                  onChange={(e) => onChange({ ...risk, trailingDistancePct: Number(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 rounded border border-border bg-bg-secondary text-text-primary text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
