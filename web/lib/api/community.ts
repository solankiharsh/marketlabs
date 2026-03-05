'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

/** Backend community indicator (market list item) */
export interface CommunityIndicatorItem {
  id: number;
  name: string;
  description: string;
  pricing_type: string;
  price: number;
  vip_free?: boolean;
  preview_image?: string;
  purchase_count?: number;
  avg_rating?: number;
  rating_count?: number;
  view_count?: number;
  created_at?: string;
  author?: { id?: number; username?: string; nickname?: string; avatar?: string };
  is_purchased?: boolean;
  is_own?: boolean;
}

export interface CommunityIndicatorsResponse {
  items: CommunityIndicatorItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface MyPurchaseItem {
  id?: number;
  indicator_id?: number;
  indicator?: { id?: number; name?: string; description?: string };
  name?: string;
  description?: string;
  price?: number;
  purchase_price?: number;
  purchased_at?: string;
  [key: string]: unknown;
}

export interface MyPurchasesResponse {
  items?: MyPurchaseItem[];
  total?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
}

const defaultListParams = {
  page: 1,
  page_size: 50,
  keyword: '',
  pricing_type: '' as '' | 'free' | 'paid',
  sort_by: 'newest' as 'newest' | 'hot' | 'price_asc' | 'price_desc' | 'rating',
};

/**
 * Fetch community (market) indicators from backend.
 * Requires auth. Used by Indicator Market so purchases appear in Indicator Analysis.
 */
export async function getCommunityIndicators(params?: {
  page?: number;
  page_size?: number;
  keyword?: string;
  filter?: 'all' | 'free' | 'paid';
  sort?: 'newest' | 'popular' | 'rating' | 'price';
}): Promise<CommunityIndicatorsResponse> {
  const p = { ...defaultListParams, ...params };
  const pricing_type =
    p.filter === 'free' ? 'free' : p.filter === 'paid' ? 'paid' : '';
  const sort_by =
    p.sort === 'popular' ? 'hot' : p.sort === 'price' ? 'price_asc' : p.sort === 'newest' ? 'newest' : p.sort === 'rating' ? 'rating' : 'newest';
  const searchParams = new URLSearchParams({
    page: String(p.page ?? 1),
    page_size: String(p.page_size ?? 50),
    sort_by,
  });
  if (p.keyword) searchParams.set('keyword', p.keyword);
  if (pricing_type) searchParams.set('pricing_type', pricing_type);
  const response = await api.get<ZingResponse<CommunityIndicatorsResponse>>(
    `/api/community/indicators?${searchParams.toString()}`
  );
  return unwrap(response);
}

/**
 * Fetch current user's purchased indicators from backend.
 */
export async function getCommunityMyPurchases(params?: {
  page?: number;
  page_size?: number;
}): Promise<MyPurchasesResponse> {
  const page = params?.page ?? 1;
  const page_size = params?.page_size ?? 50;
  const response = await api.get<ZingResponse<MyPurchasesResponse>>(
    `/api/community/my-purchases?page=${page}&page_size=${page_size}`
  );
  return unwrap(response);
}

/**
 * Purchase an indicator by id. Backend writes to qd_indicator_purchases
 * so the indicator shows in getIndicators() (Indicator Analysis sidebar).
 */
export async function purchaseCommunityIndicator(indicatorId: number): Promise<{ success: boolean; message?: string }> {
  const response = await api.post<ZingResponse<{ success?: boolean; message?: string }>>(
    `/api/community/indicators/${indicatorId}/purchase`
  );
  const data = unwrap(response) as { success?: boolean; message?: string };
  return { success: data?.success !== false, message: data?.message };
}
