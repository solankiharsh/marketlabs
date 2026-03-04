import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

// JWT Token management
class TokenManager {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('marketlabs_jwt', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('marketlabs_jwt');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('marketlabs_jwt');
    }
  }
}

const tokenManager = new TokenManager();

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000, // Increased to 60 seconds for long operations
});

// Request interceptor: Add JWT token to headers
api.interceptors.request.use((config) => {
  const token = tokenManager.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      tokenManager.clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export async function login(privyToken: string) {
  const response = await api.post('/auth/login', { privyToken });
  if (response.data.success && response.data.data.accessToken) {
    tokenManager.setToken(response.data.data.accessToken);
  }
  return response.data;
}

// Market API
export interface MarketAsset {
  id: string;
  symbol: string;
  displayName: string;
  category: string;
  active: boolean;
}

export interface MarketScan {
  id: string;
  assetId: string;
  timestamp: string;
  price: number;
  change24h?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  sma20?: number;
  ema50?: number;
  bbUpper?: number;
  bbLower?: number;
  adx?: number;
  atr?: number;
  score: number;
  setupType?: string;
  momentum?: number;
  asset: MarketAsset;
  rank?: number;
}

export async function getMarketAssets(): Promise<MarketAsset[]> {
  const response = await api.get('/api/market/assets');
  return response.data.data;
}

export async function getMarketScans(limit?: number): Promise<MarketScan[]> {
  const params = limit ? { limit } : {};
  const response = await api.get('/api/market/scans', { params });
  return response.data.data;
}

export async function getMarketRankings(limit?: number): Promise<MarketScan[]> {
  try {
    const params = limit ? { limit } : {};
    const response = await api.get('/api/market/rankings', { params });
    console.log('[API] Rankings response:', response.data);
    return response.data.data || [];
  } catch (error: any) {
    console.error('[API] Error fetching rankings:', error.response?.data || error.message);
    throw error;
  }
}

export async function getAssetDetails(symbol: string) {
  try {
    const response = await api.get(`/api/market/asset/${symbol}`);
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Invalid response structure from API');
  } catch (error: any) {
    console.error('[API] Error fetching asset details:', error.response?.data || error.message);
    throw error;
  }
}

export interface ScanJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalAssets?: number;
  scannedAssets: number;
  results?: {
    scanned: number;
    total: number;
    results: any[];
  };
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export async function triggerScan(): Promise<{ jobId: string }> {
  try {
    const response = await api.post('/api/market/scan');
    return response.data.data;
  } catch (error: any) {
    console.error('[API] Error triggering scan:', error.response?.data || error.message);
    throw error;
  }
}

export async function getScanJobStatus(jobId: string): Promise<ScanJob> {
  try {
    const response = await api.get(`/api/market/scan/${jobId}`);
    return response.data.data;
  } catch (error: any) {
    console.error('[API] Error fetching job status:', error.response?.data || error.message);
    throw error;
  }
}

// Partner Signals API
export interface PartnerSignal {
  id: string;
  assetSymbol: string;
  assetDisplayName: string;
  signalText: string;
  score: number;
  timestamp: string;
}

export async function getPartnerSignals(limit?: number): Promise<PartnerSignal[]> {
  const params = limit ? { limit } : {};
  const response = await api.get('/api/partner-signals', { params });
  return response.data.data;
}

export async function generatePartnerSignals(limit?: number): Promise<PartnerSignal[]> {
  const params = limit ? { limit } : {};
  const response = await api.post('/api/partner-signals/generate', null, { params });
  return response.data.data.signals;
}

// Enhanced Analysis API
export interface VitalityStats {
  gsr?: number;
  week52High?: number;
  week52Low?: number;
  deficit?: string;
  rateSpread?: number;
}

export interface TimeframeAnalysis {
  timeframe: 'intraday' | 'weekly' | 'monthly';
  analysis: string;
  verifiedDate?: string;
}

export interface StructuralAnalysis {
  primaryDriver: string;
  structuralImpact: string;
  marketNoise: string;
  strategicBias: string;
  acceptanceLevel?: number;
  breachLevel?: number;
}

export interface DecisionInquiry {
  id: string;
  inquiry: string;
  createdAt: string;
}

export interface RegimeAnalogy {
  id: string;
  period: string;
  description: string;
  similarity: string;
  createdAt: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url?: string;
  content?: string;
  publishedAt: string;
  fetchedAt: string;
}

export async function getVitalityStats(symbol: string): Promise<VitalityStats> {
  const response = await api.get(`/api/market/asset/${symbol}/vitality`);
  return response.data.data;
}

export async function getTimeframeAnalysis(symbol: string): Promise<TimeframeAnalysis[]> {
  const response = await api.get(`/api/market/asset/${symbol}/timeframes`);
  return response.data.data;
}

export async function getStructuralAnalysis(symbol: string): Promise<StructuralAnalysis> {
  const response = await api.get(`/api/market/asset/${symbol}/structural`);
  return response.data.data;
}

export async function getDecisionInquiries(symbol: string): Promise<DecisionInquiry[]> {
  const response = await api.get(`/api/market/asset/${symbol}/inquiries`);
  return response.data.data;
}

export async function getRegimeAnalogies(symbol: string): Promise<RegimeAnalogy[]> {
  const response = await api.get(`/api/market/asset/${symbol}/regimes`);
  return response.data.data;
}

export async function getNewsFeed(
  symbol: string,
  limit?: number,
  sentiment?: 'bullish' | 'bearish' | 'neutral' | 'mixed',
  hours?: number,
  refresh?: boolean
): Promise<NewsArticle[]> {
  const params: any = {};
  if (limit) params.limit = limit;
  if (sentiment) params.sentiment = sentiment;
  if (hours) params.hours = hours;
  if (refresh) params.refresh = 'true';
  const response = await api.get(`/api/market/asset/${symbol}/news`, { params });
  return response.data.data;
}

export async function triggerFullAnalysis(symbol: string) {
  const response = await api.post(`/api/market/asset/${symbol}/analyze`);
  return response.data.data;
}

// Acumen Analysis API
export interface DetectedPattern {
  id: string;
  patternType: 'chart' | 'candlestick';
  patternName: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  detectedAt: string;
  metadata?: any;
}

export interface SupportResistanceLevel {
  id: string;
  level: number;
  type: 'support' | 'resistance';
  strength: number;
  proximity: number;
  detectedAt: string;
}

export interface AIAnalysis {
  analysisType: 'pattern_review' | 'comprehensive';
  model: string;
  confidence?: number;
  analysis: string;
  entryStrategy?: string;
  exitStrategy?: string;
}

export async function getPatterns(symbol: string): Promise<DetectedPattern[]> {
  const response = await api.get(`/api/market/asset/${symbol}/patterns`);
  return response.data.data;
}

export async function getSupportResistance(symbol: string): Promise<SupportResistanceLevel[]> {
  const response = await api.get(`/api/market/asset/${symbol}/support-resistance`);
  return response.data.data;
}

export interface OHLCVCandle {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export async function getOHLCVData(symbol: string, count: number = 100, granularity: number = 60): Promise<OHLCVCandle[]> {
  try {
    const response = await api.get(`/api/market/asset/${symbol}/ohlcv`, {
      params: { count, granularity },
      timeout: 30000, // 30 second timeout
    });
    
    // Handle both success and error response structures
    if (response.data) {
      if (response.data.success && response.data.data) {
        return Array.isArray(response.data.data) ? response.data.data : [];
      }
      if (response.data.error) {
        console.error('[API] Backend error fetching OHLCV data:', response.data.error);
        return [];
      }
    }
    
    console.warn('[API] Invalid response structure for OHLCV data:', response.data);
    return [];
  } catch (error: any) {
    // More detailed error logging
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || error.message?.includes('Network')) {
      console.error('[API] Network timeout or connection error fetching OHLCV data for', symbol, {
        error: error.message,
        code: error.code,
      });
    } else if (error.response) {
      // Server responded with error status
      const errorData = error.response.data;
      console.error('[API] Server error fetching OHLCV data:', {
        status: error.response.status,
        error: errorData?.error || errorData,
        symbol,
        count,
        granularity,
      });
    } else if (error.request) {
      // Request was made but no response received
      console.error('[API] No response received for OHLCV data request:', {
        symbol,
        count,
        granularity,
        message: error.message,
      });
    } else {
      // Something else happened
      console.error('[API] Error fetching OHLCV data:', error.message || error, { symbol, count, granularity });
    }
    return [];
  }
}

export async function getAIAnalysis(symbol: string, type?: 'pattern_review' | 'comprehensive'): Promise<AIAnalysis> {
  const params = type ? { type } : {};
  const response = await api.get(`/api/market/asset/${symbol}/ai-analysis`, { params });
  return response.data.data;
}

