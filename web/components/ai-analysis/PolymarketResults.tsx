'use client';

interface PolymarketResultsProps {
  /** Analysis text; may be a string or an object from API (e.g. { analysis: string } or full backend result) */
  analysis: string | unknown;
}

/** Backend returns { reasoning, recommendation, key_factors, ... } - turn into readable text */
function formatAnalysisObject(obj: Record<string, unknown>): string {
  const lines: string[] = [];
  if (obj.error && typeof obj.error === 'string') {
    return obj.error;
  }
  if (typeof obj.recommendation === 'string' && obj.recommendation) {
    lines.push(`Recommendation: ${obj.recommendation}`);
  }
  if (typeof obj.reasoning === 'string' && obj.reasoning) {
    lines.push('', 'Reasoning:', obj.reasoning);
  }
  const keyFactors = obj.key_factors;
  if (Array.isArray(keyFactors) && keyFactors.length > 0) {
    lines.push('', 'Key factors:');
    keyFactors.forEach((f: unknown) => {
      lines.push(typeof f === 'string' ? `• ${f}` : `• ${String(f)}`);
    });
  }
  const riskFactors = obj.risk_factors;
  if (Array.isArray(riskFactors) && riskFactors.length > 0) {
    lines.push('', 'Risk factors:');
    riskFactors.forEach((f: unknown) => {
      lines.push(typeof f === 'string' ? `• ${f}` : `• ${String(f)}`);
    });
  }
  if (typeof obj.ai_predicted_probability === 'number' || typeof obj.market_probability === 'number') {
    const parts: string[] = [];
    if (typeof obj.market_probability === 'number') parts.push(`Market probability: ${(obj.market_probability * 100).toFixed(1)}%`);
    if (typeof obj.ai_predicted_probability === 'number') parts.push(`AI predicted: ${(obj.ai_predicted_probability * 100).toFixed(1)}%`);
    if (typeof obj.divergence === 'number') parts.push(`Divergence: ${(obj.divergence * 100).toFixed(1)}%`);
    if (parts.length) lines.push('', parts.join(' | '));
  }
  if (typeof obj.opportunity_score === 'number') {
    lines.push(`Opportunity score: ${obj.opportunity_score.toFixed(1)}`);
  }
  if (typeof obj.risk_level === 'string' && obj.risk_level) {
    lines.push(`Risk level: ${obj.risk_level}`);
  }
  return lines.join('\n').trim();
}

function toAnalysisString(analysis: string | unknown): string {
  if (typeof analysis === 'string') return analysis;
  if (analysis != null && typeof analysis === 'object') {
    const o = analysis as Record<string, unknown>;
    if ('analysis' in o && typeof o.analysis === 'string') return o.analysis;
    if ('analysis' in o && o.analysis != null && typeof o.analysis === 'object') {
      return formatAnalysisObject(o.analysis as Record<string, unknown>);
    }
    if ('reasoning' in o || 'recommendation' in o) return formatAnalysisObject(o);
  }
  return analysis != null ? String(analysis) : '';
}

export function PolymarketResults({ analysis }: PolymarketResultsProps) {
  const text = toAnalysisString(analysis);
  if (!text.trim()) {
    return <p className="text-text-muted text-sm">No analysis content.</p>;
  }
  const lines = text.split(/\r?\n/).filter(Boolean);
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-2">Analysis</h3>
      <div className="prose prose-invert max-w-none text-sm text-text-secondary">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          const isBullet = /^[-*•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed);
          if (isBullet) {
            return (
              <div key={i} className="flex gap-2 mt-1">
                <span className="text-accent-primary shrink-0">•</span>
                <span className="whitespace-pre-wrap break-words">{trimmed.replace(/^[-*•]\s|\d+\.\s/, '')}</span>
              </div>
            );
          }
          return (
            <p key={i} className="mt-2 first:mt-0 whitespace-pre-wrap break-words">
              {trimmed}
            </p>
          );
        })}
      </div>
    </div>
  );
}
