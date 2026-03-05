'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export interface FastAnalysisResult {
  analysis?: string;
  summary?: string;
  recommendation?: string;
  error?: string;
  [key: string]: unknown;
}

/** Full structured response from POST /api/fast-analysis/analyze */
export interface AnalysisDetailedResult {
  decision: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  summary: string;
  detailed_analysis?: { technical: string; fundamental: string; sentiment: string };
  trading_plan?: {
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    position_size_pct: number;
    timeframe: string;
  };
  reasons?: string[];
  risks?: string[];
  scores?: { technical: number; fundamental: number; sentiment: number; overall: number };
  indicators?: Record<string, unknown>;
  market_data?: {
    current_price: number;
    change_24h: number;
    support?: number;
    resistance?: number;
  };
  analysis_time_ms?: number;
  memory_id?: number;
  error?: string;
  [key: string]: unknown;
}

export interface FastAnalysisHistoryItem {
  id?: string;
  market?: string;
  symbol?: string;
  analysis?: string;
  created_at?: string;
  [key: string]: unknown;
}

export async function analyzeSymbol(
  market: string,
  symbol: string,
  options?: { language?: string; model?: string; timeframe?: string }
): Promise<FastAnalysisResult> {
  const response = await api.post<ZingResponse<FastAnalysisResult>>('/api/fast-analysis/analyze', {
    market,
    symbol,
    language: options?.language ?? 'en-US',
    model: options?.model,
    timeframe: options?.timeframe ?? '1D',
  });
  return unwrap(response);
}

export async function getAnalysisHistory(
  market: string,
  symbol: string,
  days: number = 7,
  limit: number = 10
): Promise<{ items: FastAnalysisHistoryItem[]; total: number }> {
  const response = await api.get<ZingResponse<{ items: FastAnalysisHistoryItem[]; total: number }>>(
    '/api/fast-analysis/history',
    { params: { market, symbol, days, limit } }
  );
  return unwrap(response) ?? { items: [], total: 0 };
}

export async function getAllAnalysisHistory(
  page: number = 1,
  pagesize: number = 20
): Promise<{ list: FastAnalysisHistoryItem[]; total: number; page: number; pagesize: number }> {
  const response = await api.get<
    ZingResponse<{ list: FastAnalysisHistoryItem[]; total: number; page: number; pagesize: number }>
  >('/api/fast-analysis/history/all', { params: { page, pagesize } });
  const data = unwrap(response);
  return (
    data ?? { list: [], total: 0, page: 1, pagesize: 20 }
  );
}

export async function submitAnalysisFeedback(
  memoryId: number,
  feedback: 'helpful' | 'not_helpful' | 'accurate' | 'inaccurate'
): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/fast-analysis/feedback', {
    memory_id: memoryId,
    feedback,
  });
  unwrap(response);
}
