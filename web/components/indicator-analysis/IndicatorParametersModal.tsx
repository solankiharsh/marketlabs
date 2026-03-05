'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import type { IndicatorItem, IndicatorParamDef } from '@/lib/api';

interface IndicatorParametersModalProps {
  open: boolean;
  onClose: () => void;
  indicator: IndicatorItem | null;
  paramDefs: IndicatorParamDef[];
  initialValues?: Record<string, number | string | boolean>;
  onConfirm: (values: Record<string, number | string | boolean>) => void;
  loading?: boolean;
}

export function IndicatorParametersModal({
  open,
  onClose,
  indicator,
  paramDefs,
  initialValues = {},
  onConfirm,
  loading = false,
}: IndicatorParametersModalProps) {
  const [values, setValues] = useState<Record<string, number | string | boolean>>({});

  // Reset form when modal opens; only depend on open and paramDefs to avoid infinite loop
  // (initialValues is often a new {} each render when not passed, which would retrigger the effect)
  useEffect(() => {
    if (!open) return;
    const next: Record<string, number | string | boolean> = {};
    const initials = initialValues ?? {};
    for (const p of paramDefs) {
      next[p.name] = initials[p.name] ?? p.default;
    }
    setValues(next);
  }, [open, paramDefs]);

  const handleChange = (name: string, value: string | number | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onConfirm(values);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Indicator Parameters</DialogTitle>
          {indicator?.name && (
            <p className="text-sm text-text-muted font-normal mt-1">{indicator.name}</p>
          )}
        </DialogHeader>
        <div className="space-y-4 py-2">
          {paramDefs.length === 0 ? (
            <p className="text-sm text-text-muted">No parameters for this indicator.</p>
          ) : (
            paramDefs.map((p) => (
              <div key={p.name} className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">
                  {p.name}
                  {p.description && (
                    <span className="block text-xs font-normal text-text-muted mt-0.5">
                      {p.description}
                    </span>
                  )}
                </label>
                {p.type === 'bool' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(values[p.name])}
                      onChange={(e) => handleChange(p.name, e.target.checked)}
                      className="rounded border-border bg-bg-secondary text-accent-primary focus:ring-accent-primary/50"
                    />
                    <span className="text-sm text-text-secondary">
                      {Boolean(values[p.name]) ? 'On' : 'Off'}
                    </span>
                  </label>
                ) : (
                  <input
                    type={p.type === 'int' || p.type === 'float' ? 'number' : 'text'}
                    value={String(values[p.name] ?? '')}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (p.type === 'int') handleChange(p.name, parseInt(v, 10) || 0);
                      else if (p.type === 'float') handleChange(p.name, parseFloat(v) || 0);
                      else handleChange(p.name, v);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm"
                  />
                )}
              </div>
            ))
          )}
        </div>
        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-elevated text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium text-sm disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Run'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
