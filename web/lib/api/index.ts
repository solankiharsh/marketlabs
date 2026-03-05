'use strict';

// Client (axios, unwrap, tokenManager)
export { api, tokenManager, unwrap } from './client';
export type { ZingResponse } from './client';

// Auth
export {
  getSecurityConfig,
  login,
  register,
  sendCode,
  getUserInfo,
  logout,
} from './auth';
export type { SecurityConfig, UserInfo, LoginResult } from './auth';

// Market
export {
  getMarketConfig,
  getMarketTypes,
  searchSymbols,
  getHotSymbols,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlistPrices,
} from './market';
export type {
  MarketConfig,
  MarketType,
  SymbolSearchItem,
  WatchlistItem,
  WatchlistPriceItem,
} from './market';

// Kline
export { getKlineData, getLatestPrice, normalizeKlines } from './kline';
export type { KlineRaw, OHLCVCandle } from './kline';

// Fast analysis
export {
  analyzeSymbol,
  getAnalysisHistory,
  getAllAnalysisHistory,
  submitAnalysisFeedback,
} from './fast-analysis';
export type {
  FastAnalysisResult,
  AnalysisDetailedResult,
  FastAnalysisHistoryItem,
} from './fast-analysis';

// Strategies
export {
  getStrategies,
  getStrategyDetail,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  startStrategy,
  stopStrategy,
  batchCreateStrategies,
  batchStartStrategies,
  batchStopStrategies,
  batchDeleteStrategies,
  getStrategyTrades,
  getStrategyPositions,
  getEquityCurve,
  previewCompileStrategy,
  getStrategyNotifications,
  markNotificationRead,
  testConnection,
} from './strategies';
export type { StrategyItem } from './strategies';

// Credentials
export {
  getCredentials,
  getCredentialDetail,
  createCredential,
  deleteCredential,
} from './credentials';
export type { CredentialItem } from './credentials';

// Dashboard
export {
  getDashboardSummary,
  getPendingOrders,
  deletePendingOrder,
} from './dashboard';
export type { DashboardSummary } from './dashboard';

// Portfolio
export {
  getPortfolioPositions,
  addPosition,
  updatePosition,
  deletePosition,
  getPortfolioSummary,
  getMonitors,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  runMonitor,
  getAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  getPortfolioGroups,
  renamePortfolioGroup,
} from './portfolio';
export type {
  PortfolioPosition,
  PortfolioSummaryData,
  PortfolioMonitor,
  AddPositionPayload,
  CreateMonitorPayload,
} from './portfolio-types';

// Trade (quick trade)
export {
  placeOrder,
  closePosition,
  getBalance,
  getQuickTradePosition,
  getTradeHistory,
} from './trade';

// Backtest
export {
  runBacktest,
  getBacktestHistory,
  getBacktestResult,
  getBacktestPrecisionInfo,
  aiAnalyzeBacktest,
} from './backtest';

// Indicators
export {
  getIndicators,
  saveIndicator,
  deleteIndicator,
  getIndicatorParams,
  verifyIndicatorCode,
  aiGenerateIndicator,
  callIndicator,
  executeIndicator,
} from './indicators';
export type {
  IndicatorItem,
  ExecuteIndicatorOutput,
  IndicatorPlot,
  IndicatorSignal,
} from './indicators';

// Marketplace (v1 localStorage)
export {
  getMarketplaceIndicators,
  getMarketplaceIndicator,
  getMarketplacePurchases,
  purchaseMarketplaceIndicator,
} from './marketplace';
export type { MarketplaceIndicator } from './marketplace';

// Global market
export {
  getGlobalOverview,
  getGlobalHeatmap,
  getGlobalNews,
  getEconomicCalendar,
  getMarketSentiment,
  getOpportunities,
  refreshGlobalData,
} from './global-market';
export type { Opportunity, MarketSentimentData, SentimentIndicator } from './global-market';

// Polymarket
export { analyzePolymarket, getPolymarketHistory } from './polymarket';

// Billing
export {
  getBillingPlans,
  purchasePlan,
  createUsdtOrder,
  getUsdtOrder,
} from './billing';

// User / Profile
export {
  getProfile,
  updateProfile,
  getMyCreditsLog,
  getMyReferrals,
  getNotificationSettings,
  updateNotificationSettings,
  changePassword,
} from './user';

// Profile & Membership (spec-aligned types and APIs)
export {
  getProfileData,
  updateProfileData,
  getCredits,
  getCreditsHistory,
  getNotifications,
  updateNotifications,
  getExchanges,
  addExchange,
  deleteExchange,
  testExchange,
  getReferralsData,
  getMembershipPlans,
  purchaseMembershipPlan,
  getMembershipStatus,
  checkPaymentStatus,
} from './profile-membership';
export type {
  UserProfile,
  CreditsInfo,
  CreditTransaction,
  NotificationSettings,
  ExchangeAccount,
  ReferralData,
  MembershipPlan,
  PaymentOrder,
  MembershipStatus,
} from './profile-membership';

// Admin
export {
  adminListUsers,
  adminGetUser,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  adminResetPassword,
  adminGetRoles,
  adminSetCredits,
  adminSetVip,
  adminGetCreditsLog,
  adminGetSystemStrategies,
  adminGetOrders,
  adminGetAiStats,
} from './admin';

// Settings (admin)
export {
  getSettingsSchema,
  getSettingsValues,
  saveSettings,
  getOpenrouterBalance,
  testServiceConnection,
} from './settings';

// Legacy stubs
export {
  getScanJobStatus,
  getPartnerSignals,
  generatePartnerSignals,
  getNewsFeed,
} from './legacy';
export type {
  MarketAsset,
  MarketScan,
  ScanJob,
  PartnerSignal,
  AIAnalysis,
  DetectedPattern,
  SupportResistanceLevel,
  NewsArticle,
} from './legacy';
