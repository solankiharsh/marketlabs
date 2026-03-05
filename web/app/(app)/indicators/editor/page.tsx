'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { getIndicators, verifyIndicatorCode, saveIndicator, aiGenerateIndicator } from '@/lib/api';
import { toast } from 'sonner';

export default function IndicatorEditorPage() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
  const id = idParam ? Number(idParam) : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  useEffect(() => {
    if (id && !Number.isNaN(id)) {
      setLoading(true);
      getIndicators()
        .then((list) => {
          const ind = list.find((i) => Number(i.id) === id);
          if (ind) {
            setName(String(ind.name ?? ''));
            setDescription(String(ind.description ?? ''));
            setCode(String(ind.code ?? ''));
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await verifyIndicatorCode(code);
      toast.success(res.valid ? 'Code is valid' : 'Verification completed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verify failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveIndicator({ name, description, code, id: id ?? undefined });
      toast.success(id ? 'Updated' : 'Saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerateLoading(true);
    try {
      const res = await aiGenerateIndicator(prompt.trim(), code || undefined);
      if (res.code) setCode(res.code);
      toast.success('Generated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generate failed');
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/indicators" className="p-2 hover:bg-white/5 rounded" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold">{id ? 'Edit Indicator' : 'New Indicator'}</h1>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            placeholder="Indicator name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary"
            placeholder="Short description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">Code</label>
          <CodeEditor value={code} onChange={setCode} minHeight={300} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleVerify}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-bg-elevated text-sm"
          >
            Verify
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary font-medium text-sm"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">AI generate</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the indicator you want to generate..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary placeholder:text-text-muted"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generateLoading}
          className="px-4 py-2 rounded-lg border border-accent-primary/40 text-accent-primary hover:bg-accent-primary/10 text-sm"
        >
          {generateLoading ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  );
}
