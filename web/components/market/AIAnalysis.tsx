'use client';

import { Brain, TrendingUp, Target, LogOut } from 'lucide-react';
import { AIAnalysis as AIAnalysisType } from '@/lib/api';

interface AIAnalysisProps {
  analysis: AIAnalysisType;
}

export function AIAnalysis({ analysis }: AIAnalysisProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-accent-primary" />
        <h3 className="text-xl font-semibold">AI Analysis</h3>
        <span className="text-xs text-text-muted ml-auto">{analysis.model}</span>
      </div>

      {analysis.confidence !== undefined && (
        <div className="mb-4 p-3 bg-white/[0.02] border border-border rounded-lg">
          <div className="text-xs text-text-muted mb-1">AI Confidence</div>
          <div className="text-2xl font-bold text-accent-primary">
            {analysis.confidence.toFixed(0)}%
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Main Analysis */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Analysis</h4>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {analysis.analysis}
          </p>
        </div>

        {/* Entry Strategy */}
        {analysis.entryStrategy && (
          <div className="p-4 bg-success/5 border border-success/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-success" />
              <h4 className="text-sm font-semibold text-success">Entry Strategy</h4>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {analysis.entryStrategy}
            </p>
          </div>
        )}

        {/* Exit Strategy */}
        {analysis.exitStrategy && (
          <div className="p-4 bg-error/5 border border-error/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <LogOut className="w-4 h-4 text-error" />
              <h4 className="text-sm font-semibold text-error">Exit Strategy</h4>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {analysis.exitStrategy}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

