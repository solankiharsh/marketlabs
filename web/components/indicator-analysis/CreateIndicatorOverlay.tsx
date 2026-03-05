'use client';

import { useState } from 'react';
import { X, CheckCircle, BookOpen } from 'lucide-react';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { verifyIndicatorCode, saveIndicator, aiGenerateIndicator } from '@/lib/api';
import { toast } from 'sonner';

const DEFAULT_CODE = `# Demo Code:
# my_indicator_name = "My Buy/Sell Indicator"
# my_indicator_description = "Buy/Sell only; execution is normalized in backend."

# df = df.copy()
# sma = df["close"].rolling(14).mean()
# buy = (df["close"] > sma) & (df["close"].shift(1) <= sma.shift(1))
# sell = (df["close"] < sma) & (df["close"].shift(1) >= sma.shift(1))
# df["buy"] = buy.fillna(False).astype(bool)
# df["sell"] = sell.fillna(False).astype(bool)

# output = { "name": my_indicator_name, "plots": [], "signals": [] }
`;

interface CreateIndicatorOverlayProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function CreateIndicatorOverlay({ open, onClose, onSaved }: CreateIndicatorOverlayProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState(DEFAULT_CODE);
  const [aiPrompt, setAiPrompt] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await verifyIndicatorCode(code);
      toast.success(res.valid ? 'Code is valid' : 'Check verification result');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verify failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveIndicator({ name: name || 'Untitled', description, code });
      toast.success('Saved');
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const res = await aiGenerateIndicator(aiPrompt.trim(), code || undefined);
      if (res.code) setCode(res.code);
      toast.success('Generated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generate failed');
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
      <header className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0">
        <h1 className="text-lg font-semibold text-text-primary">Create/Edit Indicator</h1>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          <div className="flex gap-4 px-4 py-2 border-b border-border items-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Indicator name"
              className="px-3 py-1.5 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm w-48"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm"
            />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            <span className="text-sm font-medium text-text-primary border-l-2 border-accent-primary pl-2">Python Code</span>
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              className="ml-auto px-3 py-1.5 rounded-lg border border-accent-primary/40 text-accent-primary text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Verify Code
            </button>
            <a
              href="/docs/STRATEGY_DEV_GUIDE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-text-muted hover:text-accent-primary"
            >
              <BookOpen className="w-4 h-4" />
              Development Guide
            </a>
          </div>
          <div className="px-4 py-2 bg-bg-secondary/50 border-b border-border text-xs text-text-muted flex items-start gap-2">
            <span>Note: The indicator script only computes plots + buy/sell signals. Position sizing, risk, scaling, fees/slippage belong to execution config.</span>
          </div>
          <div className="flex-1 p-4 min-h-0">
            <CodeEditor value={code} onChange={setCode} minHeight={400} className="h-full" />
          </div>
        </div>

        <div className="w-[30%] min-w-[260px] p-4 flex flex-col border-l border-border">
          <h2 className="text-sm font-semibold text-text-primary mb-2">AI Generate</h2>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe your signal logic (buy/sell only) and plots. Position sizing, risk, scaling, fees/slippage are configured in backtest."
            rows={8}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm placeholder:text-text-muted resize-none"
          />
          <button
            type="button"
            onClick={handleAiGenerate}
            disabled={generating}
            className="mt-4 w-full py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium text-sm"
          >
            {generating ? 'Generating...' : 'AI Generate Code'}
          </button>
        </div>
      </div>

      <footer className="flex items-center justify-end gap-2 h-14 px-4 border-t border-border shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-border text-text-secondary text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium text-sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </footer>
    </div>
  );
}
