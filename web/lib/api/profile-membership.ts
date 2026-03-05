'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';
import {
  getProfile as getProfileBase,
  updateProfile as updateProfileBase,
  getMyCreditsLog,
  getNotificationSettings,
  updateNotificationSettings,
} from './user';
import {
  getBillingPlans,
  createUsdtOrder,
  getUsdtOrder,
} from './billing';
import {
  getCredentials,
  createCredential,
  deleteCredential,
} from './credentials';

// ==================== Types (spec-aligned) ====================

export interface UserProfile {
  id: number | string;
  username: string;
  email?: string;
  nickname?: string;
  avatar_url?: string;
  role?: string;
  last_login?: string;
  created_at?: string;
}

export interface CreditsInfo {
  balance: number;
  is_vip: boolean;
  vip_expires_at: string | null;
}

export interface CreditTransaction {
  time: string;
  type: string;
  change: number;
  balance: number;
  remark?: string;
}

export interface CreditsHistoryResponse {
  transactions: CreditTransaction[];
  total: number;
  page?: number;
}

export interface NotificationSettings {
  channels?: Record<string, boolean>;
  default_channels?: string[];
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  notification_email?: string;
  sms_number?: string;
  discord_webhook?: string;
  webhook_url?: string;
  webhook_token?: string;
}

export interface ExchangeAccount {
  id: string;
  exchange: string;
  name?: string;
  connection_info?: string;
  created_at?: string;
}

export interface ReferralData {
  referral_link: string;
  invited_count: number;
  bonus_per_invite: number;
  register_bonus?: number;
  referrals: { user?: string; email?: string; registered: string }[];
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  period?: string;
  features?: string[];
}

export interface PaymentOrder {
  order_id: string;
  deposit_address: string;
  amount: number;
  network: string;
}

export interface MembershipStatus {
  is_vip: boolean;
  plan?: string;
  credits: number;
  expires_at?: string | null;
}

// ==================== Profile (map from existing /api/users) ====================

export async function getProfileData(): Promise<UserProfile> {
  const raw = await getProfileBase();
  const billing = (raw.billing as Record<string, unknown>) ?? {};
  return {
    id: (typeof raw.id === 'number' || typeof raw.id === 'string' ? raw.id : 0) as number | string,
    username: String(raw.username ?? ''),
    email: raw.email != null ? String(raw.email) : undefined,
    nickname: raw.nickname != null ? String(raw.nickname) : undefined,
    avatar_url: raw.avatar != null ? String(raw.avatar) : undefined,
    role: raw.role != null ? String(raw.role) : 'user',
    last_login: raw.last_login != null ? String(raw.last_login) : undefined,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
  };
}

export async function updateProfileData(data: { nickname?: string; avatar_url?: string }): Promise<void> {
  await updateProfileBase({
    nickname: data.nickname,
    avatar: data.avatar_url,
  });
}

export async function getCredits(): Promise<CreditsInfo> {
  const raw = await getProfileBase();
  const billing = (raw.billing as Record<string, unknown>) ?? {};
  const credits = typeof billing.credits === 'number' ? billing.credits : Number(billing.credits) || 0;
  const isVip = Boolean(billing.is_vip ?? billing.vip_active);
  const expires = billing.vip_expires_at != null ? String(billing.vip_expires_at) : null;
  return { balance: credits, is_vip: isVip, vip_expires_at: expires };
}

export async function getCreditsHistory(page = 1, limit = 20): Promise<CreditsHistoryResponse> {
  const { items, total } = await getMyCreditsLog(page, limit);
  const transactions: CreditTransaction[] = (items as Record<string, unknown>[]).map((row) => {
    const action = String(row.action ?? row.type ?? '');
    const amount = Number(row.amount ?? 0);
    const balanceAfter = Number(row.balance_after ?? row.balance ?? 0);
    const created = row.created_at != null ? new Date(String(row.created_at)).toLocaleString() : '';
    const typeLabel =
      action === 'consume' || action.includes('consume')
        ? 'Consume'
        : action === 'register_bonus' || action.includes('register')
          ? 'Register Bonus'
          : action === 'referral_bonus' || action.includes('referral')
            ? 'Referral Bonus'
            : action.includes('membership') || action.includes('topup')
              ? 'Top Up'
              : action || 'Other';
    return {
      time: created,
      type: typeLabel,
      change: amount,
      balance: balanceAfter,
      remark: row.remark != null ? String(row.remark) : undefined,
    };
  });
  return { transactions, total: total ?? transactions.length, page };
}

export async function sendPasswordVerificationCode(): Promise<void> {
  try {
    await api.post<ZingResponse<null>>('/api/users/password/send-code', {}).then((r) => unwrap(r));
  } catch {
    throw new Error('Verification code endpoint not available. Use current password to change password.');
  }
}

export async function changePasswordWithCode(verification_code: string, new_password: string): Promise<void> {
  try {
    const response = await api.post<ZingResponse<null>>('/api/users/password/change', {
      verification_code,
      new_password,
    });
    unwrap(response);
  } catch {
    throw new Error('Use current password to change password.');
  }
}

export async function getNotifications(): Promise<NotificationSettings> {
  const raw = await getNotificationSettings();
  const channels: Record<string, boolean> = {};
  const list = (raw.default_channels as string[]) ?? ['browser'];
  ['in_app', 'telegram', 'email', 'sms', 'discord', 'webhook'].forEach((ch) => {
    channels[ch] = list.includes(ch) || list.includes(ch === 'in_app' ? 'browser' : ch);
  });
  return {
    channels,
    default_channels: list,
    telegram_bot_token: raw.telegram_bot_token != null ? String(raw.telegram_bot_token) : undefined,
    telegram_chat_id: raw.telegram_chat_id != null ? String(raw.telegram_chat_id) : undefined,
    notification_email: raw.email != null ? String(raw.email) : undefined,
    sms_number: raw.phone != null ? String(raw.phone) : undefined,
    discord_webhook: raw.discord_webhook != null ? String(raw.discord_webhook) : undefined,
    webhook_url: raw.webhook_url != null ? String(raw.webhook_url) : undefined,
    webhook_token: raw.webhook_token != null ? String(raw.webhook_token) : undefined,
  };
}

export async function updateNotifications(data: NotificationSettings): Promise<void> {
  const default_channels = data.default_channels ?? (data.channels ? Object.entries(data.channels).filter(([, v]) => v).map(([k]) => (k === 'in_app' ? 'browser' : k)) : ['browser']);
  await updateNotificationSettings({
    default_channels,
    telegram_bot_token: data.telegram_bot_token,
    telegram_chat_id: data.telegram_chat_id,
    email: data.notification_email,
    phone: data.sms_number,
    discord_webhook: data.discord_webhook,
    webhook_url: data.webhook_url,
    webhook_token: data.webhook_token,
  });
}

export async function getExchanges(): Promise<ExchangeAccount[]> {
  const items = await getCredentials();
  return items.map((c) => ({
    id: String(c.id),
    exchange: String(c.exchange_id ?? c.name ?? ''),
    name: c.name != null ? String(c.name) : undefined,
    connection_info: c.api_key_hint != null ? String(c.api_key_hint) : undefined,
    created_at: c.created_at != null ? String(c.created_at) : undefined,
  }));
}

export async function addExchange(payload: { exchange: string; name?: string; config: Record<string, unknown> }): Promise<ExchangeAccount> {
  const result = await createCredential({
    exchange_id: payload.exchange,
    name: payload.name,
    ...payload.config,
  });
  return {
    id: String(result.id ?? ''),
    exchange: payload.exchange,
    name: payload.name,
  };
}

export async function deleteExchange(id: string): Promise<void> {
  await deleteCredential(Number(id));
}

export async function testExchange(id: string): Promise<{ status: string; message?: string }> {
  try {
    const response = await api.post<ZingResponse<{ status: string; message?: string }>>(
      '/api/credentials/test',
      { id: Number(id) }
    );
    const data = unwrap(response) as { status?: string; message?: string };
    return { status: data?.status ?? 'unknown', message: data?.message };
  } catch (e) {
    return { status: 'failed', message: e instanceof Error ? e.message : 'Test failed' };
  }
}

export async function getReferralsData(): Promise<ReferralData> {
  const response = await api.get<ZingResponse<{
    list?: Record<string, unknown>[];
    total?: number;
    referral_code?: string;
    referral_bonus?: number;
    register_bonus?: number;
  }>>('/api/users/my-referrals', { params: { page: 1, page_size: 100 } });
  const data = unwrap(response) ?? {};
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const refCode = data.referral_code != null ? String(data.referral_code) : '';
  const referral_link = `${baseUrl}/register?ref=${refCode}`;
  const list = (data.list ?? []) as Record<string, unknown>[];
  const referrals = list.map((r) => ({
    user: String(r.username ?? r.email ?? ''),
    email: r.email != null ? String(r.email) : undefined,
    registered: r.created_at != null ? new Date(String(r.created_at)).toLocaleDateString() : '',
  }));
  return {
    referral_link,
    invited_count: data.total ?? referrals.length,
    bonus_per_invite: Number(data.referral_bonus ?? 50),
    register_bonus: Number(data.register_bonus ?? 100),
    referrals,
  };
}

// ==================== Membership (map from existing /api/billing) ====================

export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  const { plans } = await getBillingPlans();
  const raw = (plans as Record<string, unknown>[]) ?? [];
  if (raw.length === 0) {
    return [
      { id: 'monthly', name: 'Monthly', price: 19.9, credits: 500, period: '/month', features: ['+500 Credits'] },
      { id: 'yearly', name: 'Yearly', price: 199, credits: 8000, period: '/year', features: ['+8000 Credits'] },
      { id: 'lifetime', name: 'Lifetime', price: 499, credits: 800, period: ' one-time', features: ['Monthly bonus +800 Credits'] },
    ];
  }
  return raw.map((p) => ({
    id: String(p.plan ?? p.id ?? p.name ?? ''),
    name: String(p.name ?? p.plan ?? 'Plan'),
    price: Number(p.price ?? p.price_usd ?? 0),
    credits: Number(p.credits ?? p.credits_once ?? 0),
    period: String(p.period ?? (p.id === 'lifetime' ? ' one-time' : p.id === 'yearly' ? '/year' : '/month')),
    features: p.features as string[] | undefined,
  }));
}

export async function purchaseMembershipPlan(planId: string): Promise<PaymentOrder> {
  const raw = await createUsdtOrder(planId);
  return {
    order_id: String(raw.order_id ?? raw.id ?? ''),
    deposit_address: String(raw.address ?? raw.deposit_address ?? ''),
    amount: Number(raw.amount ?? raw.amount_usdt ?? 0),
    network: String(raw.network ?? raw.chain ?? 'TRC20'),
  };
}

export async function getMembershipStatus(): Promise<MembershipStatus> {
  const raw = await getProfileBase();
  const billing = (raw.billing as Record<string, unknown>) ?? {};
  return {
    is_vip: Boolean(billing.is_vip ?? billing.vip_active),
    plan: billing.plan != null ? String(billing.plan) : undefined,
    credits: Number(billing.credits ?? 0),
    expires_at: billing.vip_expires_at != null ? String(billing.vip_expires_at) : null,
  };
}

export async function checkPaymentStatus(orderId: string): Promise<{ status: string }> {
  const raw = await getUsdtOrder(orderId, true);
  return { status: String(raw.status ?? raw.payment_status ?? 'waiting') };
}
