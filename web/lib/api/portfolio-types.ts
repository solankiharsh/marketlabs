'use strict';

export interface PortfolioPosition {
  id: number;
  market: string;
  symbol: string;
  name?: string;
  side: 'long' | 'short';
  quantity: number;
  entry_price: number;
  entry_time?: string;
  notes?: string;
  tags?: string[];
  group_name?: string;
  created_at: string;
  updated_at: string;
  current_price?: number;
  price_change?: number;
  price_change_percent?: number;
  market_value?: number;
  cost_value?: number;
  pnl?: number;
  pnl_percent?: number;
}

export interface PortfolioSummaryData {
  total_cost?: number;
  market_value?: number;
  total_pnl?: number;
  total_pnl_percent?: number;
  positions_count?: number;
  [key: string]: unknown;
}

export interface PortfolioMonitor {
  id: number;
  name: string;
  position_ids: number[];
  monitor_type: 'ai' | 'price_alert' | 'pnl_alert';
  config: { interval_minutes?: number; custom_prompt?: string; [key: string]: unknown };
  notification_config: Record<string, unknown>;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  last_result?: Record<string, unknown>;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface AddPositionPayload {
  market: string;
  symbol: string;
  name?: string;
  side?: 'long' | 'short';
  quantity: number;
  entry_price: number;
  entry_time?: string;
  notes?: string;
  tags?: string[];
  group_name?: string;
}

export interface CreateMonitorPayload {
  name: string;
  position_ids?: number[];
  monitor_type?: 'ai' | 'price_alert' | 'pnl_alert';
  config?: { interval_minutes?: number; custom_prompt?: string; [key: string]: unknown };
  notification_config?: Record<string, unknown>;
  is_active?: boolean;
}
